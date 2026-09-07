import { Ticket, TicketPriority, TicketSort, TicketStatus } from '../models/ticket';

export interface TicketFilters {
  search: string;
  status: TicketStatus | 'All';
  priority: TicketPriority | 'All';
  sort: TicketSort;
}

const priorityRank: Record<TicketPriority, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };

export function filterAndSortTickets(tickets: Ticket[], filters: TicketFilters): Ticket[] {
  const search = filters.search.trim().toLowerCase();

  return tickets
    .filter(
      (ticket) =>
        !search ||
        [ticket.id, ticket.title, ticket.customer, ticket.assignedTo].some((value) =>
          value.toLowerCase().includes(search),
        ),
    )
    .filter((ticket) => filters.status === 'All' || ticket.status === filters.status)
    .filter((ticket) => filters.priority === 'All' || ticket.priority === filters.priority)
    .sort((left, right) => {
      if (filters.sort === 'priority-high')
        return priorityRank[right.priority] - priorityRank[left.priority];
      if (filters.sort === 'priority-low')
        return priorityRank[left.priority] - priorityRank[right.priority];
      const dateDifference = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return filters.sort === 'oldest' ? -dateDifference : dateDifference;
    });
}
