import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NOT_FOUND, WORK_ORDER } from '../../testing/work-order-fixtures';
import { WorkOrderDetail } from './work-order-detail';

describe('WorkOrderDetail', () => {
  let fixture: ComponentFixture<WorkOrderDetail>;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ id: '42' }));
    await TestBed.configureTestingModule({
      imports: [WorkOrderDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WorkOrderDetail);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('renders loading then detail, nullable fields and back navigation', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading work order');
    http.expectOne('/api/work-orders/42').flush(WORK_ORDER);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(WORK_ORDER.title);
    expect(fixture.nativeElement.textContent).toContain('No description provided');
    expect(fixture.nativeElement.querySelector('a[href="/work-orders"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('renders the actual not-found message and permits manual retry', () => {
    http
      .expectOne('/api/work-orders/42')
      .flush(NOT_FOUND, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      NOT_FOUND.message,
    );
    fixture.nativeElement.querySelector('button').click();
    http.expectOne('/api/work-orders/42').flush(WORK_ORDER);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('cancels stale details when the route ID changes', () => {
    const original = http.expectOne('/api/work-orders/42');
    params.next(convertToParamMap({ id: '43' }));
    expect(original.cancelled).toBe(true);
    http.expectOne('/api/work-orders/43').flush({ ...WORK_ORDER, id: 43 });
    expect(fixture.componentInstance.order()?.id).toBe(43);
  });

  it.each(['invalid', '0', '-1', '9007199254740992'])(
    'rejects invalid route ID %s without an HTTP call',
    (id) => {
      http.expectOne('/api/work-orders/42').flush(WORK_ORDER);
      params.next(convertToParamMap({ id }));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Invalid work-order ID');
      expect(fixture.componentInstance.order()).toBeNull();
      http.expectNone((request) => request.url.startsWith('/api/work-orders'));
    },
  );
});
