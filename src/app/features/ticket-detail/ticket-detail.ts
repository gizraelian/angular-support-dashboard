import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs';
import { TICKET_STATUSES, Ticket, TicketStatus } from '../../models/ticket';
import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-detail.html',
  styleUrl: './ticket-detail.scss',
})
export class TicketDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statuses = TICKET_STATUSES;
  readonly ticket = signal<Ticket | null>(null);
  readonly loading = signal(true);
  readonly savingStatus = signal(false);
  readonly savingNote = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly statusForm = new FormGroup({
    status: new FormControl<TicketStatus | null>(null, Validators.required),
  });
  readonly noteForm = new FormGroup({
    note: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(500)],
    }),
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        tap(() => {
          this.loading.set(true);
          this.errorMessage.set('');
        }),
        switchMap((id) =>
          this.ticketService.getTicket(id).pipe(
            catchError(() => {
              this.errorMessage.set('This ticket could not be found or loaded.');
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((ticket) => {
        this.ticket.set(ticket);
        this.statusForm.setValue({ status: ticket.status });
        this.loading.set(false);
      });
  }

  updateStatus(): void {
    const ticket = this.ticket();
    if (!ticket || this.statusForm.invalid) return;

    this.savingStatus.set(true);
    this.clearMessages();
    this.ticketService
      .updateStatus(ticket.id, this.statusForm.controls.status.value as TicketStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTicket) => {
          this.ticket.set(updatedTicket);
          this.successMessage.set(`Status updated to ${updatedTicket.status}.`);
          this.savingStatus.set(false);
        },
        error: () => {
          this.errorMessage.set('The status could not be updated. Please try again.');
          this.savingStatus.set(false);
        },
      });
  }

  addNote(): void {
    const ticket = this.ticket();
    if (!ticket || this.noteForm.invalid) {
      this.noteForm.markAllAsTouched();
      return;
    }

    this.savingNote.set(true);
    this.clearMessages();
    this.ticketService
      .addNote(ticket.id, this.noteForm.controls.note.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTicket) => {
          this.ticket.set(updatedTicket);
          this.noteForm.reset();
          this.successMessage.set('Internal note added.');
          this.savingNote.set(false);
        },
        error: () => {
          this.errorMessage.set('The note could not be added. Please try again.');
          this.savingNote.set(false);
        },
      });
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
