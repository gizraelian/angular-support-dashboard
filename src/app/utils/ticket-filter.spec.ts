import { TICKETS } from '../data/tickets';
import { filterAndSortTickets } from './ticket-filter';

describe('filterAndSortTickets', () => {
  it('searches across ticket ID, title, customer, and assignee', () => {
    const results = filterAndSortTickets(TICKETS, {
      search: 'northstar',
      status: 'All',
      priority: 'All',
      sort: 'newest',
    });
    expect(results.map((ticket) => ticket.id)).toEqual(['SUP-1048', 'SUP-1038']);
  });

  it('combines status and priority filters', () => {
    const results = filterAndSortTickets(TICKETS, {
      search: '',
      status: 'In Progress',
      priority: 'Critical',
      sort: 'newest',
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('SUP-1040');
  });

  it('sorts critical tickets before lower priorities', () => {
    const results = filterAndSortTickets(TICKETS, {
      search: '',
      status: 'All',
      priority: 'All',
      sort: 'priority-high',
    });
    expect(results[0].priority).toBe('Critical');
  });
});
