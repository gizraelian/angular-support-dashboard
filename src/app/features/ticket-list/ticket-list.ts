import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { TICKET_PRIORITIES, TICKET_STATUSES, Ticket, TicketSort } from '../../models/ticket';
import { TicketService } from '../../services/ticket.service';
import { filterAndSortTickets } from '../../utils/ticket-filter';

@Component({
  selector: 'app-ticket-list',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-list.html',
  styleUrl: './ticket-list.scss',
})
export class TicketList {
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageSize = 6;

  readonly statuses = TICKET_STATUSES;
  readonly priorities = TICKET_PRIORITIES;
  readonly tickets = signal<Ticket[]>([]);
  readonly filteredTickets = signal<Ticket[]>([]);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTickets().length / this.pageSize)),
  );
  readonly visibleTickets = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredTickets().slice(start, start + this.pageSize);
  });
  readonly rangeStart = computed(() =>
    this.filteredTickets().length ? (this.page() - 1) * this.pageSize + 1 : 0,
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize, this.filteredTickets().length),
  );

  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<'All' | (typeof TICKET_STATUSES)[number]>('All', { nonNullable: true }),
    priority: new FormControl<'All' | (typeof TICKET_PRIORITIES)[number]>('All', {
      nonNullable: true,
    }),
    sort: new FormControl<TicketSort>('newest', { nonNullable: true }),
  });

  constructor() {
    this.filtersForm.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged(
          (previous, current) => JSON.stringify(previous) === JSON.stringify(current),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.applyFilters();
      });
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.ticketService
      .getTickets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
          this.applyFilters();
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Tickets could not be loaded. Please try again.');
          this.loading.set(false);
        },
      });
  }

  previousPage(): void {
    this.page.update((page) => Math.max(1, page - 1));
  }

  nextPage(): void {
    this.page.update((page) => Math.min(this.totalPages(), page + 1));
  }

  private applyFilters(): void {
    this.filteredTickets.set(filterAndSortTickets(this.tickets(), this.filtersForm.getRawValue()));
  }
}
