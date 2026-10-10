export const WORK_ORDER_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const WORK_ORDER_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

/** WorkOrderResponse: LocalDate/LocalDateTime remain backend ISO strings (no timezone added). */
export interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  requesterEmail: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Backend create DTO; status and timestamps are supplied by the server. */
export interface CreateWorkOrderRequest {
  title: string;
  description: string | null;
  priority: WorkOrderPriority;
  requesterEmail: string;
  dueDate: string | null;
}

/** Spring Data VIA_DTO serialization, not the legacy PageImpl JSON shape. */
export interface WorkOrderPage {
  content: WorkOrder[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface WorkOrderQuery {
  page: number;
  size: number;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
}

export interface WorkOrderApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors: Record<string, string>;
}
