import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { InjectionToken, isDevMode } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateWorkOrderRequest, WorkOrder, WorkOrderStatus } from '../models/work-order';

export const BROWSER_WRITE_BLOCKER =
  'Browser writes are blocked pending CSRF-safe authentication. Use the authorized local API harness; no credentials are collected here.';
export function localWorkflowPreview(dev: boolean, origin: string): boolean {
  return dev && origin === 'http://127.0.0.1:4200';
}
export const LOCAL_WORKFLOW_PREVIEW = new InjectionToken<boolean>('Local workflow preview', {
  providedIn: 'root',
  factory: () => localWorkflowPreview(isDevMode(), globalThis.location?.origin ?? ''),
});
export interface WorkOrderWriteTransport {
  create(request: CreateWorkOrderRequest): Observable<WorkOrder>;
  updateStatus(id: number, status: WorkOrderStatus): Observable<WorkOrder>;
}
// Deliberately no application provider. Only mocked HTTP tests supply this seam.
export const WORK_ORDER_WRITE_TRANSPORT = new InjectionToken<WorkOrderWriteTransport>(
  'Future approved write transport',
);

/** Contract adapter exercised with HttpTestingController only; never registered in the app. */
export class WorkOrderHttpWriteContract implements WorkOrderWriteTransport {
  constructor(private readonly http: HttpClient) {}
  create(request: CreateWorkOrderRequest): Observable<WorkOrder> {
    return this.http.post<WorkOrder>('/api/work-orders', request);
  }
  updateStatus(id: number, status: WorkOrderStatus): Observable<WorkOrder> {
    return this.http.patch<WorkOrder>(`/api/work-orders/${id}/status`, { status });
  }
}
export function writeErrorMessage(error: unknown): string {
  if (error instanceof Error && !(error instanceof HttpErrorResponse)) return error.message;
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Authentication was rejected. No write was retried.';
    if (error.status === 403) return 'The API forbids this operation. No write was retried.';
    if (error.status === 400) return 'Check the highlighted fields and request values.';
  }
  return 'The write outcome is uncertain. Reload work orders before manually submitting again.';
}
export function fieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (error instanceof HttpErrorResponse && error.status === 400) {
    const values: unknown = error.error?.validationErrors;
    if (values && typeof values === 'object') {
      for (const [field, message] of Object.entries(values)) {
        if (typeof message === 'string') result[field] = message;
      }
    }
  }
  return result;
}
