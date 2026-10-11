import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WORK_ORDER_PRIORITIES, WorkOrderPriority } from '../../models/work-order';
import { LocalSessionService } from '../../services/local-session.service';
import { WorkOrderService } from '../../services/work-order.service';
import {
  BROWSER_WRITE_BLOCKER,
  LOCAL_WORKFLOW_PREVIEW,
  fieldErrors,
  writeErrorMessage,
} from '../../services/work-order-write';

@Component({
  selector: 'app-work-order-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './work-order-create.html',
  styleUrl: '../work-orders.scss',
})
export class WorkOrderCreate {
  readonly session = inject(LocalSessionService);
  readonly preview = inject(LOCAL_WORKFLOW_PREVIEW);
  readonly blocker = BROWSER_WRITE_BLOCKER;
  private readonly service = inject(WorkOrderService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly priorities = WORK_ORDER_PRIORITIES;
  readonly busy = signal(false);
  readonly message = signal('');
  readonly errors = signal<Record<string, string>>({});
  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
    description: ['', Validators.maxLength(2000)],
    priority: [
      'MEDIUM' as WorkOrderPriority,
      [Validators.required, Validators.pattern(/^(LOW|MEDIUM|HIGH)$/)],
    ],
    requesterEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    dueDate: [''],
  });
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.errors.set({});
      this.message.set('');
    });
  }
  submit(): void {
    if (!this.preview || this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.message.set('');
    this.errors.set({});
    this.busy.set(true);
    const value = this.form.getRawValue();
    this.service
      .createWorkOrder({
        ...value,
        description: value.description || null,
        dueDate: value.dueDate || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.busy.set(false);
          this.message.set(`Created work order #${order.id}.`);
          void this.router.navigate(['/work-orders', order.id]);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.errors.set(fieldErrors(error));
          this.message.set(writeErrorMessage(error));
        },
      });
  }
}
