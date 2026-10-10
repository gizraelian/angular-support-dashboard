import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { WORK_ORDER } from '../../testing/work-order-fixtures';
import { WorkOrderService } from '../../services/work-order.service';
import { LOCAL_WORKFLOW_PREVIEW } from '../../services/work-order-write';
import { WorkOrderCreate } from './work-order-create';

describe('Create form', () => {
  const createWorkOrder = vi.fn();
  async function setup(preview = true) {
    createWorkOrder.mockReset();
    await TestBed.configureTestingModule({
      imports: [WorkOrderCreate],
      providers: [
        provideRouter([]),
        { provide: LOCAL_WORKFLOW_PREVIEW, useValue: preview },
        { provide: WorkOrderService, useValue: { createWorkOrder } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(WorkOrderCreate);
    fixture.detectChanges();
    return fixture;
  }
  function fill(component: WorkOrderCreate) {
    component.form.patchValue({
      title: 'Fictional repair',
      priority: 'HIGH',
      requesterEmail: 'demo@example.com',
    });
  }
  it('rejects blank, whitespace, long and invalid fields without writing', async () => {
    const fixture = await setup();
    const c = fixture.componentInstance;
    c.submit();
    expect(createWorkOrder).not.toHaveBeenCalled();
    fill(c);
    c.form.patchValue({
      title: ' '.repeat(3),
      description: 'x'.repeat(2001),
      requesterEmail: 'bad',
    });
    c.submit();
    expect(c.form.invalid).toBe(true);
    expect(createWorkOrder).not.toHaveBeenCalled();
    c.form.patchValue({ title: 'x'.repeat(121), requesterEmail: 'a'.repeat(250) + '@b.com' });
    expect(c.form.controls.title.invalid).toBe(true);
    expect(c.form.controls.requesterEmail.invalid).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Check the required value');
  });
  it('submits typed nullable fields once, reports loading and navigates to server detail', async () => {
    const fixture = await setup();
    const c = fixture.componentInstance;
    fill(c);
    const pending = new Subject<typeof WORK_ORDER>();
    createWorkOrder.mockReturnValue(pending);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.submit();
    c.submit();
    expect(createWorkOrder).toHaveBeenCalledOnce();
    expect(c.busy()).toBe(true);
    expect(createWorkOrder).toHaveBeenCalledWith({
      title: 'Fictional repair',
      description: null,
      priority: 'HIGH',
      requesterEmail: 'demo@example.com',
      dueDate: null,
    });
    pending.next(WORK_ORDER);
    pending.complete();
    expect(c.busy()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/work-orders', WORK_ORDER.id]);
    expect(c.message()).toContain('Created');
  });
  it('shows backend field errors, preserves input, clears stale errors and recovers on manual submit', async () => {
    const fixture = await setup();
    const c = fixture.componentInstance;
    fill(c);
    createWorkOrder.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { validationErrors: { title: 'Backend rule', priority: 7 } },
          }),
      ),
    );
    c.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Backend rule');
    expect(c.errors()).toEqual({ title: 'Backend rule' });
    expect(c.form.controls.title.value).toBe('Fictional repair');
    c.form.controls.title.setValue('Corrected');
    expect(c.errors()).toEqual({});
    createWorkOrder.mockReturnValue(of(WORK_ORDER));
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.submit();
    expect(c.message()).toContain('Created');
    expect(createWorkOrder).toHaveBeenCalledTimes(2);
  });
  it.each([401, 403, 503])('handles HTTP %s without retries or lost input', async (status) => {
    const fixture = await setup();
    const c = fixture.componentInstance;
    fill(c);
    createWorkOrder.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    c.submit();
    expect(c.busy()).toBe(false);
    expect(c.message()).not.toBe('');
    expect(createWorkOrder).toHaveBeenCalledOnce();
    expect(c.form.controls.title.value).toBe('Fictional repair');
  });
  it('hides controls outside local preview and ignores programmatic submission', async () => {
    const fixture = await setup(false);
    fill(fixture.componentInstance);
    fixture.componentInstance.submit();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(createWorkOrder).not.toHaveBeenCalled();
  });
  it('unsubscribes pending work when destroyed', async () => {
    const fixture = await setup();
    fill(fixture.componentInstance);
    const pending = new Subject<typeof WORK_ORDER>();
    createWorkOrder.mockReturnValue(pending);
    fixture.componentInstance.submit();
    expect(pending.observed).toBe(true);
    fixture.destroy();
    expect(pending.observed).toBe(false);
  });
});
