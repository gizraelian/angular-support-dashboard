import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { WorkOrderService } from '../../services/work-order.service';
import { LOCAL_WORKFLOW_PREVIEW } from '../../services/work-order-write';
import { WORK_ORDER } from '../../testing/work-order-fixtures';
import { WorkOrderDetail } from './work-order-detail';
describe('Status form', () => {
  const getWorkOrder = vi.fn();
  const updateStatus = vi.fn();
  async function setup() {
    getWorkOrder.mockReset().mockReturnValue(of(WORK_ORDER));
    updateStatus.mockReset();
    const params = new BehaviorSubject(convertToParamMap({ id: '42' }));
    await TestBed.configureTestingModule({
      imports: [WorkOrderDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: LOCAL_WORKFLOW_PREVIEW, useValue: true },
        { provide: WorkOrderService, useValue: { getWorkOrder, updateStatus } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(WorkOrderDetail);
    fixture.detectChanges();
    return { fixture, params };
  }
  it('changes status once and refreshes from a separate persisted GET', async () => {
    const { fixture } = await setup();
    const c = fixture.componentInstance;
    const pending = new Subject<typeof WORK_ORDER>();
    updateStatus.mockReturnValue(pending);
    c.status.setValue('COMPLETED');
    c.updateStatus();
    c.updateStatus();
    expect(updateStatus).toHaveBeenCalledOnce();
    expect(updateStatus).toHaveBeenCalledWith(42, 'COMPLETED');
    expect(c.saving()).toBe(true);
    getWorkOrder.mockReturnValue(of({ ...WORK_ORDER, status: 'COMPLETED' }));
    pending.next(WORK_ORDER);
    pending.complete();
    expect(getWorkOrder).toHaveBeenCalledTimes(2);
    expect(c.order()?.status).toBe('COMPLETED');
    expect(c.writeMessage()).toContain('saved');
  });
  it.each([400, 401, 403, 503])(
    'handles status HTTP %s and permits manual recovery',
    async (status) => {
      const { fixture } = await setup();
      const c = fixture.componentInstance;
      updateStatus.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status,
              error: { validationErrors: { status: 'Invalid status' } },
            }),
        ),
      );
      c.status.setValue('IN_PROGRESS');
      c.updateStatus();
      expect(c.saving()).toBe(false);
      expect(c.writeMessage()).not.toBe('');
      expect(updateStatus).toHaveBeenCalledOnce();
      expect(getWorkOrder).toHaveBeenCalledOnce();
      updateStatus.mockReturnValue(of(WORK_ORDER));
      c.updateStatus();
      expect(getWorkOrder).toHaveBeenCalledTimes(2);
    },
  );
  it('reports refresh failure separately after a successful write', async () => {
    const { fixture } = await setup();
    const c = fixture.componentInstance;
    updateStatus.mockReturnValue(of(WORK_ORDER));
    getWorkOrder.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    c.updateStatus();
    expect(c.writeMessage()).toContain('saved');
    expect(c.errorMessage()).not.toBe('');
    expect(updateStatus).toHaveBeenCalledOnce();
  });
  it('cancels observation on route changes and rejects invalid status', async () => {
    const { fixture, params } = await setup();
    const c = fixture.componentInstance;
    c.status.setValue('BOGUS' as never);
    c.updateStatus();
    expect(updateStatus).not.toHaveBeenCalled();
    c.status.setValue('COMPLETED');
    const pending = new Subject<typeof WORK_ORDER>();
    updateStatus.mockReturnValue(pending);
    c.updateStatus();
    params.next(convertToParamMap({ id: '43' }));
    expect(pending.observed).toBe(false);
    expect(c.saving()).toBe(false);
  });
});
