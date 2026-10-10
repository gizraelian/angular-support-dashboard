import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WORK_ORDER } from '../testing/work-order-fixtures';
import { WorkOrderService } from './work-order.service';
import {
  BROWSER_WRITE_BLOCKER,
  LOCAL_WORKFLOW_PREVIEW,
  WORK_ORDER_WRITE_TRANSPORT,
  WorkOrderHttpWriteContract,
  localWorkflowPreview,
} from './work-order-write';

const body = {
  title: 'Fictional fixture',
  description: null,
  priority: 'HIGH' as const,
  requesterEmail: 'demo@example.com',
  dueDate: null,
};
describe('Fail-closed write boundary', () => {
  it('never emits create or status HTTP requests without an approved provider', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(WorkOrderService);
    const errors: string[] = [];
    service.createWorkOrder(body).subscribe({ error: (e: Error) => errors.push(e.message) });
    service
      .updateStatus(42, 'COMPLETED')
      .subscribe({ error: (e: Error) => errors.push(e.message) });
    expect(errors).toEqual([BROWSER_WRITE_BLOCKER, BROWSER_WRITE_BLOCKER]);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
  it('blocks an accidentally supplied transport outside local development', () => {
    const transport = { create: vi.fn(), updateStatus: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCAL_WORKFLOW_PREVIEW, useValue: false },
        { provide: WORK_ORDER_WRITE_TRANSPORT, useValue: transport },
      ],
    });
    const service = TestBed.inject(WorkOrderService);
    service.createWorkOrder(body).subscribe({ error: () => {} });
    service.updateStatus(42, 'COMPLETED').subscribe({ error: () => {} });
    expect(transport.create).not.toHaveBeenCalled();
    expect(transport.updateStatus).not.toHaveBeenCalled();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
  it('limits previews to the exact loopback development origin; production remains closed', () => {
    expect(localWorkflowPreview(true, 'http://127.0.0.1:4200')).toBe(true);
    for (const origin of [
      'https://example.com',
      'http://localhost:4200',
      'http://127.0.0.1:4300',
      'https://127.0.0.1:4200',
    ]) {
      expect(localWorkflowPreview(true, origin)).toBe(false);
    }
    expect(localWorkflowPreview(false, 'http://127.0.0.1:4200')).toBe(false);
  });
});
describe('Write HTTP contracts (mock transport only)', () => {
  let service: WorkOrderService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCAL_WORKFLOW_PREVIEW, useValue: true },
        {
          provide: WORK_ORDER_WRITE_TRANSPORT,
          useFactory: () => new WorkOrderHttpWriteContract(TestBed.inject(HttpClient)),
        },
      ],
    });
    service = TestBed.inject(WorkOrderService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });
  it('creates a typed order and patches only its status using relative proxy paths', () => {
    const next = vi.fn();
    service.createWorkOrder(body).subscribe(next);
    const create = http.expectOne('/api/work-orders');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(body);
    expect(create.request.headers.has('Authorization')).toBe(false);
    create.flush(WORK_ORDER);
    expect(next).toHaveBeenCalledWith(WORK_ORDER);
    service.updateStatus(42, 'COMPLETED').subscribe(next);
    const patch = http.expectOne('/api/work-orders/42/status');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'COMPLETED' });
    patch.flush({ ...WORK_ORDER, status: 'COMPLETED' });
  });
  it.each([0, 400, 401, 403, 500, 502, 503, 504])(
    'does not retry either write after status %s',
    async (status) => {
      vi.useFakeTimers();
      const error = vi.fn();
      service.createWorkOrder(body).subscribe({ error });
      service.updateStatus(42, 'COMPLETED').subscribe({ error });
      for (const url of ['/api/work-orders', '/api/work-orders/42/status']) {
        const request = http.expectOne(url);
        if (status === 0) request.error(new ProgressEvent('error'));
        else request.flush({}, { status, statusText: 'Failure' });
      }
      await vi.advanceTimersByTimeAsync(5000);
      expect(error).toHaveBeenCalledTimes(2);
      http.expectNone(() => true);
    },
  );
});
