import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LocalSessionService } from './local-session.service';
import { localBrowserBoundary, createLocalBrowserBoundary } from './local-browser.interceptor';
import { LOCAL_BROWSER_ENABLED } from './local-browser-policy';
import {
  WORK_ORDER_WRITE_TRANSPORT,
  WorkOrderHttpWriteContract,
  LOCAL_WORKFLOW_PREVIEW,
} from './work-order-write';
import { WorkOrderService } from './work-order.service';
describe('Release security boundary', () => {
  afterEach(() => vi.restoreAllMocks());
  it('handles real transport 401 expiry and preserves 403 without retrying', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([createLocalBrowserBoundary(() => true)])),
        provideHttpClientTesting(),
        { provide: LOCAL_BROWSER_ENABLED, useValue: true },
      ],
    });
    const session = TestBed.inject(LocalSessionService);
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);
    session.authenticated.set(true);
    client
      .patch('/api/work-orders/1/status', { status: 'COMPLETED' })
      .subscribe({ error: () => {} });
    http.expectOne('/api/work-orders/1/status').flush(null, { status: 401, statusText: 'Expired' });
    expect(session.authenticated()).toBe(false);
    expect(session.message()).toContain('expired');
    session.authenticated.set(true);
    client.post('/api/work-orders', {}).subscribe({ error: () => {} });
    http.expectOne('/api/work-orders').flush(null, { status: 403, statusText: 'CSRF rejected' });
    expect(session.authenticated()).toBe(true);
    http.expectNone(() => true);
    http.verify();
  });
  it('rejects auth endpoints and injected writes even when runtime tokens are accidentally enabled', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([localBrowserBoundary])),
        provideHttpClientTesting(),
        { provide: LOCAL_BROWSER_ENABLED, useValue: true },
        { provide: LOCAL_WORKFLOW_PREVIEW, useValue: true },
        {
          provide: WORK_ORDER_WRITE_TRANSPORT,
          useFactory: () => new WorkOrderHttpWriteContract(TestBed.inject(HttpClient)),
        },
      ],
    });
    const errors = vi.fn();
    const service = TestBed.inject(WorkOrderService);
    service
      .createWorkOrder({
        title: 'Fictional',
        description: null,
        priority: 'HIGH',
        requesterEmail: 'demo@example.com',
        dueDate: null,
      })
      .subscribe({ error: errors });
    service.updateStatus(1, 'COMPLETED').subscribe({ error: errors });
    TestBed.inject(HttpClient).get('/api/local-auth/session').subscribe({ error: errors });
    TestBed.inject(HttpClient).post('/api/local-auth/login', {}).subscribe({ error: errors });
    TestBed.inject(HttpClient)
      .post('http://127.0.0.1:8080/api/work-orders', {})
      .subscribe({ error: errors });
    expect(errors).toHaveBeenCalledTimes(5);
    TestBed.inject(HttpTestingController).expectNone(() => true);
    service.getWorkOrder(1).subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/work-orders/1').flush({ id: 1 });
    TestBed.inject(HttpTestingController).verify();
  });
});
