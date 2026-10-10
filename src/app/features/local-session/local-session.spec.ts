import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LOCAL_BROWSER_ENABLED } from '../../services/local-browser-policy';
import { LocalSession } from './local-session';
describe('Local login UI credential cleanup', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [LocalSession],
      providers: [
        provideHttpClient(
          withXsrfConfiguration({ cookieName: 'M4C-XSRF', headerName: 'X-M4C-XSRF' }),
        ),
        provideHttpClientTesting(),
        { provide: LOCAL_BROWSER_ENABLED, useValue: true },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(LocalSession);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/local-auth/csrf').flush(null);
    http.expectOne('/api/local-auth/session').flush({ authenticated: false });
    fixture.detectChanges();
    return { fixture, http };
  }
  afterEach(() => {
    document.cookie = 'M4C-XSRF=; Max-Age=0; Path=/';
  });
  it('clears passwords immediately, suppresses duplicate login and retains no password after rejection', async () => {
    const { fixture, http } = await setup();
    const c = fixture.componentInstance;
    c.form.setValue({ username: 'fixture', password: 'test-only-password' });
    c.login();
    c.login();
    expect(c.form.controls.password.value).toBe('');
    http.expectOne('/api/local-auth/csrf').flush(null);
    http.expectOne('/api/local-auth/login').flush(null, { status: 401, statusText: 'Rejected' });
    fixture.detectChanges();
    expect(c.session.busy()).toBe(false);
    expect(fixture.nativeElement.querySelector('input[type=password]').value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Incorrect local');
    http.expectNone('/api/local-auth/login');
    http.verify();
  });
  it('logs in and logs out, clearing all credential controls and changing visible state', async () => {
    const { fixture, http } = await setup();
    const c = fixture.componentInstance;
    c.form.setValue({ username: 'fixture', password: 'test-only-password' });
    c.login();
    http.expectOne('/api/local-auth/csrf').flush(null);
    http.expectOne('/api/local-auth/login').flush(null);
    http.expectOne('/api/local-auth/csrf').flush(null);
    http.expectOne('/api/local-auth/session').flush({ authenticated: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type=password]')).toBeNull();
    expect(c.form.controls.password.value).toBe('');
    c.logout();
    http.expectOne('/api/local-auth/logout').flush(null);
    http.expectOne('/api/local-auth/csrf').flush(null);
    fixture.detectChanges();
    expect(c.form.getRawValue()).toEqual({ username: '', password: '' });
    expect(c.session.authenticated()).toBe(false);
    http.verify();
  });
  it('shows session recovery on a fresh component without reading browser storage', async () => {
    await TestBed.configureTestingModule({
      imports: [LocalSession],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCAL_BROWSER_ENABLED, useValue: true },
      ],
    }).compileComponents();
    const getLocal = vi.spyOn(Storage.prototype, 'getItem');
    const fixture = TestBed.createComponent(LocalSession);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/local-auth/csrf').flush(null);
    http.expectOne('/api/local-auth/session').flush({ authenticated: true });
    expect(fixture.componentInstance.session.authenticated()).toBe(true);
    expect(getLocal).not.toHaveBeenCalled();
    getLocal.mockRestore();
    http.verify();
  });
});
