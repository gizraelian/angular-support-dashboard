import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, retry, throwError, timer } from 'rxjs';
import { WorkOrder, WorkOrderApiError, WorkOrderPage, WorkOrderQuery } from '../models/work-order';

/** Only safe reads. No credentials, writes, or ticket-domain behavior. */
@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/work-orders';

  getWorkOrders(query: WorkOrderQuery): Observable<WorkOrderPage> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    if (query.status) params = params.set('status', query.status);
    if (query.priority) params = params.set('priority', query.priority);
    return this.http.get<WorkOrderPage>(this.url, { params }).pipe(this.retryGet());
  }

  getWorkOrder(id: number): Observable<WorkOrder> {
    return this.http.get<WorkOrder>(`${this.url}/${id}`).pipe(this.retryGet());
  }

  private retryGet<T>() {
    return retry<T>({
      count: 2,
      delay: (error: unknown, attempt: number) =>
        error instanceof HttpErrorResponse && [0, 502, 503, 504].includes(error.status)
          ? timer(attempt * 300)
          : throwError(() => error),
    });
  }
}

export function workOrderErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse))
    return 'Work orders could not be loaded. Please try again.';
  if (error.status === 0)
    return 'The local work-order API is unavailable. Check that the backend and development proxy are running.';
  if (error.status === 401 || error.status === 403)
    return 'The API denied read access. Check the backend configuration; no credentials are sent by this feature.';
  // Security/proxy errors may be HTML or empty, rather than the application ApiError DTO.
  const body: Partial<WorkOrderApiError> | null = error.error;
  if (body && typeof body === 'object' && typeof body.message === 'string') return body.message;
  if (error.status === 404) return 'Work order not found.';
  return 'Work orders could not be loaded. Please try again.';
}
