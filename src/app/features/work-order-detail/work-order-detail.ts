import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkOrder } from '../../models/work-order';
import { WorkOrderService, workOrderErrorMessage } from '../../services/work-order.service';

@Component({
  selector: 'app-work-order-detail',
  imports: [DatePipe, RouterLink],
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

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const raw = params.get('id') ?? '';
        const id = Number(raw);
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
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(workOrderErrorMessage(error));
          this.loading.set(false);
        },
      });
  }
}
