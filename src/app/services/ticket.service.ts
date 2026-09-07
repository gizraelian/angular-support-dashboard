import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, defer, delay, map, of, throwError } from 'rxjs';
import { TICKETS } from '../data/tickets';
import { Ticket, TicketNote, TicketStatus } from '../models/ticket';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly ticketsSubject = new BehaviorSubject<Ticket[]>(structuredClone(TICKETS));

  getTickets(): Observable<Ticket[]> {
    return defer(() => of(structuredClone(this.ticketsSubject.value))).pipe(delay(350));
  }

  getTicket(id: string): Observable<Ticket> {
    return defer(() => {
      const ticket = this.ticketsSubject.value.find((item) => item.id === id);
      return ticket ? of(structuredClone(ticket)) : throwError(() => new Error('Ticket not found'));
    }).pipe(delay(250));
  }

  updateStatus(id: string, status: TicketStatus): Observable<Ticket> {
    return this.updateTicket(id, (ticket) => ({ ...ticket, status }));
  }

  addNote(id: string, body: string): Observable<Ticket> {
    const note: TicketNote = {
      id: `N-${Date.now()}`,
      body: body.trim(),
      author: 'George Izraelian',
      createdAt: new Date().toISOString(),
    };
    return this.updateTicket(id, (ticket) => ({ ...ticket, notes: [...ticket.notes, note] }));
  }

  private updateTicket(id: string, update: (ticket: Ticket) => Ticket): Observable<Ticket> {
    return defer(() => {
      const tickets = this.ticketsSubject.value;
      const index = tickets.findIndex((ticket) => ticket.id === id);
      if (index === -1) return throwError(() => new Error('Ticket not found'));

      const updatedTicket = update(tickets[index]);
      this.ticketsSubject.next(
        tickets.map((ticket) => (ticket.id === id ? updatedTicket : ticket)),
      );
      return of(structuredClone(updatedTicket));
    }).pipe(delay(300));
  }
}
