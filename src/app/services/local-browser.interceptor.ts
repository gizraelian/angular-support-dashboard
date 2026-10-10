import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { approvedBrowserRuntime } from './local-browser-policy';
import { LocalSessionService } from './local-session.service';
/** Independent compile-time release guard: an injected transport cannot bypass this interceptor. */
export function createLocalBrowserBoundary(allowed: () => boolean): HttpInterceptorFn {
  return (request, next) => {
    const path = new URL(request.url, globalThis.location?.origin ?? 'http://invalid.local')
      .pathname;
    const localAuth = path.startsWith('/api/local-auth');
    const workOrderWrite =
      path.startsWith('/api/work-orders') && !['GET', 'HEAD'].includes(request.method);
    if ((localAuth || workOrderWrite) && (!allowed() || !request.url.startsWith('/api/'))) {
      return throwError(
        () =>
          new Error(
            'Local browser authentication and writes are disabled in this build or origin.',
          ),
      );
    }
    const session = localAuth || workOrderWrite ? inject(LocalSessionService) : null;
    return next(request).pipe(
      catchError((error) => {
        if (workOrderWrite && error instanceof HttpErrorResponse && error.status === 401)
          session?.expired();
        return throwError(() => error);
      }),
    );
  };
}
export const localBrowserBoundary = createLocalBrowserBoundary(approvedBrowserRuntime);
