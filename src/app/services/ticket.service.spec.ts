import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TicketService } from './ticket.service';

describe('TicketService', () => {
  it('updates a ticket status and returns the updated ticket', async () => {
    const service = TestBed.inject(TicketService);
    const updated = await firstValueFrom(service.updateStatus('SUP-1047', 'In Progress'));
    expect(updated.status).toBe('In Progress');
    expect((await firstValueFrom(service.getTicket('SUP-1047'))).status).toBe('In Progress');
  });
});
