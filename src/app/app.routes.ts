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
  { path: '', pathMatch: 'full', redirectTo: 'tickets' },
  { path: '**', redirectTo: 'tickets' },
];
