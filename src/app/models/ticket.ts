export const TICKET_STATUSES = ['New', 'In Progress', 'Waiting', 'Resolved'] as const;
export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface TicketNote {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  assignedTo: string;
  description: string;
  notes: TicketNote[];
}

export type TicketSort = 'newest' | 'oldest' | 'priority-high' | 'priority-low';
