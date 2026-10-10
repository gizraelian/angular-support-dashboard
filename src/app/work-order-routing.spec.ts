import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { TicketList } from './features/ticket-list/ticket-list';
import { WorkOrderDetail } from './features/work-order-detail/work-order-detail';
import { WorkOrderList } from './features/work-order-list/work-order-list';
import { WORK_ORDER, WORK_ORDER_PAGE } from './testing/work-order-fixtures';

describe('Work-order routes alongside fictional tickets', () => {
  it('loads both work-order routes and preserves the in-memory ticket route', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/work-orders', WorkOrderList);
    http.expectOne('/api/work-orders?page=0&size=10').flush(WORK_ORDER_PAGE);
    await harness.navigateByUrl('/work-orders/42', WorkOrderDetail);
    http.expectOne('/api/work-orders/42').flush(WORK_ORDER);
    const tickets = await harness.navigateByUrl('/tickets', TicketList);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(tickets.tickets().length).toBeGreaterThan(0);
    http.expectNone((request) => request.url.startsWith('/api'));
    http.verify();
  });
});
