import { HttpClient } from '@angular/common/http';
import { Provider, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { CreateWorkOrderRequest, WorkOrder, WorkOrderStatus } from '../models/work-order';
import { approvedBrowserRuntime } from './local-browser-policy';
import { LocalSessionService } from './local-session.service';
import { WORK_ORDER_WRITE_TRANSPORT, WorkOrderWriteTransport } from './work-order-write';
class SessionWriteTransport implements WorkOrderWriteTransport {
  private readonly http = inject(HttpClient);
  private readonly session = inject(LocalSessionService);
  private permitted(): boolean {
    return approvedBrowserRuntime() && this.session.authenticated();
  }
  create(request: CreateWorkOrderRequest): Observable<WorkOrder> {
    return this.permitted()
      ? this.http.post<WorkOrder>('/api/work-orders', request)
      : throwError(() => new Error('Sign in to the local development API first.'));
  }
  updateStatus(id: number, status: WorkOrderStatus): Observable<WorkOrder> {
    return this.permitted()
      ? this.http.patch<WorkOrder>(`/api/work-orders/${id}/status`, { status })
      : throwError(() => new Error('Sign in to the local development API first.'));
  }
}
export function localBrowserProviders(): Provider[] {
  return approvedBrowserRuntime()
    ? [{ provide: WORK_ORDER_WRITE_TRANSPORT, useFactory: () => new SessionWriteTransport() }]
    : [];
}
