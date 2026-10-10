import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WorkOrder, WorkOrderPage } from '../models/work-order';
import { NOT_FOUND, WORK_ORDER, WORK_ORDER_PAGE } from '../testing/work-order-fixtures';
import { WorkOrderService, workOrderErrorMessage } from './work-order.service';

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WorkOrderService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('retrieves the typed VIA_DTO page and sends server pagination with no credentials', () => {
    let actual: WorkOrderPage | undefined;
    service.getWorkOrders({ page: 1, size: 10 }).subscribe((result) => (actual = result));
    const request = http.expectOne('/api/work-orders?page=1&size=10');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(false);
    request.flush({ ...WORK_ORDER_PAGE, page: { ...WORK_ORDER_PAGE.page, number: 1 } });
    expect(actual?.page.number).toBe(1);
    expect(actual?.content[0].requesterEmail).toBe(WORK_ORDER.requesterEmail);
  });

  it('passes both actual enum filters to the server', () => {
    service
      .getWorkOrders({ page: 0, size: 20, status: 'IN_PROGRESS', priority: 'HIGH' })
      .subscribe();
    const request = http.expectOne(
      '/api/work-orders?page=0&size=20&status=IN_PROGRESS&priority=HIGH',
    );
    request.flush(WORK_ORDER_PAGE);
  });

  it('retrieves typed detail including nullable fields and timezone-free timestamps', () => {
    let actual: WorkOrder | undefined;
    service.getWorkOrder(42).subscribe((result) => (actual = result));
    const request = http.expectOne('/api/work-orders/42');
    expect(request.request.method).toBe('GET');
    request.flush(WORK_ORDER);
    expect(actual).toEqual(WORK_ORDER);
    expect(actual?.dueDate).toBeNull();
  });

  it('preserves an empty server page', () => {
    let actual: WorkOrderPage | undefined;
    service.getWorkOrders({ page: 0, size: 10 }).subscribe((result) => (actual = result));
    http.expectOne('/api/work-orders?page=0&size=10').flush({
      content: [],
      page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
    });
    expect(actual?.content).toEqual([]);
    expect(actual?.page.totalPages).toBe(0);
  });

  it.each([400, 401, 403, 404, 500])('does not automatically retry HTTP %s', (status) => {
    const error = vi.fn();
    service.getWorkOrder(42).subscribe({ error });
    http.expectOne('/api/work-orders/42').flush(NOT_FOUND, { status, statusText: 'Error' });
    expect(error).toHaveBeenCalledOnce();
    http.expectNone('/api/work-orders/42');
  });

  it('retries a transient list GET then succeeds with identical query parameters', async () => {
    vi.useFakeTimers();
    const next = vi.fn();
    service.getWorkOrders({ page: 1, size: 10, priority: 'LOW' }).subscribe(next);
    const url = '/api/work-orders?page=1&size=10&priority=LOW';
    http.expectOne(url).flush('', { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(300);
    http.expectOne(url).flush(WORK_ORDER_PAGE);
    expect(next).toHaveBeenCalledWith(WORK_ORDER_PAGE);
  });

  it('bounds detail retries to two after network failures', async () => {
    vi.useFakeTimers();
    const error = vi.fn();
    service.getWorkOrder(42).subscribe({ error });
    http.expectOne('/api/work-orders/42').error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(300);
    http.expectOne('/api/work-orders/42').error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(600);
    http.expectOne('/api/work-orders/42').error(new ProgressEvent('error'));
    expect(error).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000);
    http.expectNone('/api/work-orders/42');
  });

  it('cancels pending retry when unsubscribed', async () => {
    vi.useFakeTimers();
    const subscription = service.getWorkOrder(42).subscribe();
    http.expectOne('/api/work-orders/42').flush('', { status: 502, statusText: 'Bad Gateway' });
    subscription.unsubscribe();
    await vi.advanceTimersByTimeAsync(1000);
    http.expectNone('/api/work-orders/42');
  });

  it('uses ApiError messages and handles non-DTO proxy/security failures', () => {
    expect(workOrderErrorMessage(new HttpErrorResponse({ status: 404, error: NOT_FOUND }))).toBe(
      NOT_FOUND.message,
    );
    expect(
      workOrderErrorMessage(new HttpErrorResponse({ status: 502, error: '<html>proxy</html>' })),
    ).toContain('try again');
    expect(workOrderErrorMessage(new HttpErrorResponse({ status: 403 }))).toContain(
      'denied read access',
    );
    expect(workOrderErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('unavailable');
  });
});
