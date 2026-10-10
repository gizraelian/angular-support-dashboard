import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tickets',
    loadComponent: () =>
      import('./features/ticket-list/ticket-list').then((module) => module.TicketList),
    title: 'Ticket Queue | Support Operations',
  },
  {
    path: 'tickets/:id',
    loadComponent: () =>
      import('./features/ticket-detail/ticket-detail').then((module) => module.TicketDetail),
    title: 'Ticket Details | Support Operations',
  },
  {
    path: 'work-orders',
    loadComponent: () =>
      import('./features/work-order-list/work-order-list').then((module) => module.WorkOrderList),
    title: 'Work Orders | Support Operations',
  },
  {
    path: 'work-orders/new',
    loadComponent: () =>
      import('./features/work-order-create/work-order-create').then(
        (module) => module.WorkOrderCreate,
      ),
    title: 'Create Work Order | Support Operations',
  },
  {
    path: 'work-orders/:id',
    loadComponent: () =>
      import('./features/work-order-detail/work-order-detail').then(
        (module) => module.WorkOrderDetail,
      ),
    title: 'Work-order Details | Support Operations',
  },
  { path: '', pathMatch: 'full', redirectTo: 'tickets' },
  { path: '**', redirectTo: 'tickets' },
];
