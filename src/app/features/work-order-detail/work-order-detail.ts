import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { WORK_ORDER_STATUSES, WorkOrderStatus } from '../../models/work-order';
import {
  BROWSER_WRITE_BLOCKER,
  LOCAL_WORKFLOW_PREVIEW,
  fieldErrors,
  writeErrorMessage,
} from '../../services/work-order-write';
import { WorkOrder } from '../../models/work-order';
import { WorkOrderService, workOrderErrorMessage } from '../../services/work-order.service';

@Component({
  selector: 'app-work-order-detail',
  imports: [DatePipe, RouterLink, ReactiveFormsModule],
  templateUrl: './work-order-detail.html',
  styleUrl: '../work-orders.scss',
})
export class WorkOrderDetail {
  private readonly service = inject(WorkOrderService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private id: number | null = null;
  readonly order = signal<WorkOrder | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly preview = inject(LOCAL_WORKFLOW_PREVIEW);
  readonly blocker = BROWSER_WRITE_BLOCKER;
  readonly statuses = WORK_ORDER_STATUSES;
  readonly status = new FormControl<WorkOrderStatus>('OPEN', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.pattern(/^(OPEN|IN_PROGRESS|COMPLETED|CANCELLED)$/),
    ],
  });
  readonly saving = signal(false);
  readonly writeMessage = signal('');
  private writeRequest?: Subscription;

  updateStatus(): void {
    if (!this.preview || this.saving() || this.id === null || this.status.invalid || !this.order())
      return;
    this.saving.set(true);
    this.writeMessage.set('');
    this.writeRequest = this.service
      .updateStatus(this.id, this.status.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.writeMessage.set('Status saved. Reloading persisted work order.');
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.writeMessage.set(fieldErrors(error)['status'] ?? writeErrorMessage(error));
        },
      });
  }

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const raw = params.get('id') ?? '';
        const id = Number(raw);
        this.writeRequest?.unsubscribe();
        this.saving.set(false);
        this.writeMessage.set('');
        this.id = /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(id) ? id : null;
        this.load();
      });
  }

  load(): void {
    this.request?.unsubscribe();
    this.order.set(null);
    this.errorMessage.set('');
    if (this.id === null) {
      this.errorMessage.set('Invalid work-order ID.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.request = this.service
      .getWorkOrder(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.status.setValue(order.status);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(workOrderErrorMessage(error));
          this.loading.set(false);
        },
      });
  }
}
