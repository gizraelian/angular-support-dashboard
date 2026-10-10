import { HttpErrorResponse, provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LocalSessionService } from './local-session.service';
import { LOCAL_BROWSER_ENABLED, browserSessionAllowed } from './local-browser-policy';
describe('Local session lifecycle', () => {
  let service: LocalSessionService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withXsrfConfiguration({ cookieName: 'M4C-XSRF', headerName: 'X-M4C-XSRF' }),
        ),
        provideHttpClientTesting(),
        { provide: LOCAL_BROWSER_ENABLED, useValue: true },
      ],
    });
    service = TestBed.inject(LocalSessionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    document.cookie = 'M4C-XSRF=; Max-Age=0; Path=/';
    vi.useRealTimers();
  });
  it('recovers a cookie-backed session after page reload without credentials', () => {
    service.recover().subscribe();
    http.expectOne('/api/local-auth/csrf').flush(null);
    const status = http.expectOne('/api/local-auth/session');
    expect(status.request.headers.has('Authorization')).toBe(false);
    status.flush({ authenticated: true });
    expect(service.authenticated()).toBe(true);
    expect(service.ready()).toBe(true);
  });
  it('logs in with CSRF and refreshes the rotated token before declaring success', () => {
    document.cookie = 'M4C-XSRF=fixture-csrf; Path=/';
    service.login('fixture', 'fixture-password').subscribe();
    http.expectOne('/api/local-auth/csrf').flush(null);
    const login = http.expectOne('/api/local-auth/login');
    expect(login.request.method).toBe('POST');
    expect(login.request.body.get('username')).toBe('fixture');
    expect(login.request.headers.get('X-M4C-XSRF')).toBe('fixture-csrf');
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush(null);
    expect(service.authenticated()).toBe(false);
    http.expectOne('/api/local-auth/csrf').flush(null);
    http.expectOne('/api/local-auth/session').flush({ authenticated: true });
    expect(service.authenticated()).toBe(true);
  });
  it.each([401, 403, 503])('does not retry login after %s', async (status) => {
    vi.useFakeTimers();
    service.login('fixture', 'test-only').subscribe({ error: () => {} });
    http.expectOne('/api/local-auth/csrf').flush(null);
    http.expectOne('/api/local-auth/login').flush(null, { status, statusText: 'Rejected' });
    await vi.advanceTimersByTimeAsync(5000);
    expect(service.busy()).toBe(false);
    expect(service.authenticated()).toBe(false);
    http.expectNone(() => true);
  });
  it('logs out, clears local state, and refreshes CSRF for the next login', () => {
    service.authenticated.set(true);
    service.logout().subscribe();
    http.expectOne('/api/local-auth/logout').flush(null);
    expect(service.authenticated()).toBe(false);
    http.expectOne('/api/local-auth/csrf').flush(null);
    expect(service.message()).toContain('invalidated');
  });
  it('does not falsely claim successful logout on 403 or retry it', () => {
    service.authenticated.set(true);
    service.logout().subscribe({ error: () => {} });
    http.expectOne('/api/local-auth/logout').flush(null, { status: 403, statusText: 'CSRF' });
    expect(service.authenticated()).toBe(true);
    expect(service.message()).toContain('could not be confirmed');
    http.expectNone(() => true);
  });
  it('preserves successful logout when the token refresh fails', () => {
    service.authenticated.set(true);
    service.logout().subscribe({ error: () => {} });
    http.expectOne('/api/local-auth/logout').flush(null);
    http.expectOne('/api/local-auth/csrf').error(new ProgressEvent('error'));
    expect(service.authenticated()).toBe(false);
    expect(service.message()).toContain('Signed out, but');
  });
  it('shows session expiry and recovery failure', () => {
    service.authenticated.set(true);
    service.expired();
    expect(service.authenticated()).toBe(false);
    expect(service.message()).toContain('expired');
    service.recover().subscribe({ error: () => {} });
    http.expectOne('/api/local-auth/csrf').error(new ProgressEvent('error'));
    expect(service.ready()).toBe(true);
    expect(service.message()).toContain('unavailable');
  });
  it('requires an explicit compile-time build, dev mode and exact origin', () => {
    expect(browserSessionAllowed(true, true, 'http://127.0.0.1:4200')).toBe(true);
    expect(browserSessionAllowed(false, true, 'http://127.0.0.1:4200')).toBe(false);
    expect(browserSessionAllowed(true, false, 'http://127.0.0.1:4200')).toBe(false);
    expect(browserSessionAllowed(true, true, 'https://public.example')).toBe(false);
  });
});
