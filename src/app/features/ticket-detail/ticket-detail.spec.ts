import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TICKETS } from '../../data/tickets';
import { TicketService } from '../../services/ticket.service';
import { TicketDetail } from './ticket-detail';

describe('TicketDetail', () => {
  const ticket = structuredClone(TICKETS[0]);
  const ticketService = {
    getTicket: vi.fn(() => of(ticket)),
    updateStatus: vi.fn((id: string, status: string) => of({ ...ticket, id, status })),
    addNote: vi.fn(() => of(ticket)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [TicketDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: ticket.id })) },
        },
        { provide: TicketService, useValue: ticketService },
      ],
    }).compileComponents();
  });

  it('validates an internal note before submission', () => {
    const component = TestBed.createComponent(TicketDetail).componentInstance;
    component.noteForm.controls.note.setValue('No');
    expect(component.noteForm.invalid).toBe(true);
    component.noteForm.controls.note.setValue('Customer confirmed the issue is still occurring.');
    expect(component.noteForm.valid).toBe(true);
  });

  it('updates the displayed ticket after saving a status', () => {
    const component = TestBed.createComponent(TicketDetail).componentInstance;
    component.statusForm.controls.status.setValue('Resolved');
    component.updateStatus();
    expect(ticketService.updateStatus).toHaveBeenCalledWith(ticket.id, 'Resolved');
    expect(component.ticket()?.status).toBe('Resolved');
    expect(component.successMessage()).toContain('Resolved');
  });
});
