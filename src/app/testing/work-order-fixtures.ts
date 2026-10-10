import { WorkOrder, WorkOrderApiError, WorkOrderPage } from '../models/work-order';

export const WORK_ORDER: WorkOrder = {
  id: 42,
  title: 'Inspect cooling system',
  description: null,
  status: 'OPEN',
  priority: 'HIGH',
  requesterEmail: 'requester@example.test',
  dueDate: null,
  createdAt: '2026-10-10T12:30:00',
  updatedAt: '2026-10-10T12:30:00',
};
export const WORK_ORDER_PAGE: WorkOrderPage = {
  content: [WORK_ORDER],
  page: { number: 0, size: 10, totalElements: 11, totalPages: 2 },
};
export const NOT_FOUND: WorkOrderApiError = {
  timestamp: '2026-10-10T12:30:00',
  status: 404,
  error: 'Not Found',
  message: 'Work order not found with id: 42',
  path: '/api/work-orders/42',
  validationErrors: {},
};
