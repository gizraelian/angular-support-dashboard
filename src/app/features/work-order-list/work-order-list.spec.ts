import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WORK_ORDER_PAGE } from '../../testing/work-order-fixtures';
import { WorkOrderList } from './work-order-list';

describe('WorkOrderList', () => {
  let fixture: ComponentFixture<WorkOrderList>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkOrderList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WorkOrderList);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  const url = '/api/work-orders?page=0&size=10';

  it('renders loading then server results and a detail link', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading work orders');
    http.expectOne(url).flush(WORK_ORDER_PAGE);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('11 matching work orders');
    expect(fixture.nativeElement.querySelector('a[href="/work-orders/42"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Not set');
  });

  it('requests the next server page and resets page when filters change', () => {
    http.expectOne(url).flush(WORK_ORDER_PAGE);
    fixture.componentInstance.changePage(1);
    http
      .expectOne('/api/work-orders?page=1&size=10')
      .flush({ ...WORK_ORDER_PAGE, page: { ...WORK_ORDER_PAGE.page, number: 1 } });
    fixture.componentInstance.filtersForm.setValue({ status: 'COMPLETED', priority: 'HIGH' });
    http
      .expectOne('/api/work-orders?page=0&size=10&status=COMPLETED&priority=HIGH')
      .flush(WORK_ORDER_PAGE);
    expect(fixture.componentInstance.page()).toBe(0);
  });

  it('renders an empty page and disables both pagination buttons', () => {
    http
      .expectOne(url)
      .flush({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No work orders');
    const buttons = fixture.nativeElement.querySelectorAll(
      '.pagination button',
    ) as NodeListOf<HTMLButtonElement>;
    expect([...buttons].every((button) => button.disabled)).toBe(true);
    fixture.componentInstance.changePage(1);
    http.expectNone(url);
  });

  it('shows an error and manually retries a safe GET', () => {
    http.expectOne(url).flush({ message: 'Read failed' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Read failed',
    );
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    http.expectOne(url).flush(WORK_ORDER_PAGE);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('cancels obsolete filter requests and requests all values when filters clear', () => {
    const original = http.expectOne(url);
    fixture.componentInstance.filtersForm.controls.status.setValue('OPEN');
    expect(original.cancelled).toBe(true);
    http.expectOne('/api/work-orders?page=0&size=10&status=OPEN').flush(WORK_ORDER_PAGE);
    fixture.componentInstance.filtersForm.controls.status.setValue('');
    http.expectOne(url).flush(WORK_ORDER_PAGE);
  });
});
