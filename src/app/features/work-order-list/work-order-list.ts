import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LOCAL_WORKFLOW_PREVIEW } from '../../services/work-order-write';
import { LocalSessionService } from '../../services/local-session.service';
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  WorkOrderPage,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../../models/work-order';
import { WorkOrderService, workOrderErrorMessage } from '../../services/work-order.service';

@Component({
  selector: 'app-work-order-list',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './work-order-list.html',
  styleUrl: '../work-orders.scss',
})
export class WorkOrderList {
  private readonly service = inject(WorkOrderService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly preview = inject(LOCAL_WORKFLOW_PREVIEW);
  readonly session = inject(LocalSessionService);
  readonly statuses = WORK_ORDER_STATUSES;
  readonly priorities = WORK_ORDER_PRIORITIES;
  readonly result = signal<WorkOrderPage | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly page = signal(0);
  readonly filtersForm = new FormGroup({
    status: new FormControl<WorkOrderStatus | ''>('', { nonNullable: true }),
    priority: new FormControl<WorkOrderPriority | ''>('', { nonNullable: true }),
  });

  constructor() {
    this.filtersForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(0);
      this.load();
    });
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set('');
    this.result.set(null);
    const filters = this.filtersForm.getRawValue();
    this.request = this.service
      .getWorkOrders({
        page: this.page(),
        size: 10,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.page.set(result.page.number);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(workOrderErrorMessage(error));
          this.loading.set(false);
        },
      });
  }

  changePage(delta: number): void {
    const result = this.result();
    const next = this.page() + delta;
    if (this.loading() || !result || next < 0 || next >= result.page.totalPages) return;
    this.page.set(next);
    this.load();
  }
}
