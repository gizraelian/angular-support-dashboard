import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, switchMap, tap, throwError } from 'rxjs';
import { LOCAL_BROWSER_ENABLED } from './local-browser-policy';
@Injectable({ providedIn: 'root' })
export class LocalSessionService {
  readonly enabled = inject(LOCAL_BROWSER_ENABLED);
  private readonly http = inject(HttpClient);
  readonly authenticated = signal(false);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  private readonly base = '/api/local-auth';
  private bootstrap(): Observable<void> {
    return this.http.get<void>(`${this.base}/csrf`);
  }
  private guard(): void {
    if (!this.enabled) throw new Error('Local browser authentication is disabled in this build.');
  }
  recover(): Observable<void> {
    this.guard();
    this.ready.set(false);
    return this.bootstrap().pipe(
      switchMap(() => this.http.get<{ authenticated: boolean }>(`${this.base}/session`)),
      tap((state) => {
        this.authenticated.set(state.authenticated);
        this.message.set(
          state.authenticated
            ? 'Local session restored.'
            : 'Sign in to create or change work orders.',
        );
      }),
      map(() => undefined),
      catchError((error) => {
        this.authenticated.set(false);
        this.message.set('The local session API is unavailable.');
        return throwError(() => error);
      }),
      finalize(() => this.ready.set(true)),
    );
  }
  login(username: string, password: string): Observable<void> {
    this.guard();
    this.busy.set(true);
    this.message.set('');
    // The credentials are passed once as form data; this service never retains them in fields/storage.
    const body = new HttpParams().set('username', username).set('password', password);
    return this.bootstrap().pipe(
      switchMap(() => this.http.post<void>(`${this.base}/login`, body)),
      switchMap(() => this.bootstrap()),
      switchMap(() => this.http.get<{ authenticated: boolean }>(`${this.base}/session`)),
      tap((state) => {
        this.authenticated.set(state.authenticated);
        if (!state.authenticated) throw new Error('Session was not established.');
        this.message.set('Signed in to the local development API.');
      }),
      map(() => undefined),
      catchError((error) => {
        this.authenticated.set(false);
        this.message.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Incorrect local username or password.'
            : 'Login failed. Check the local API and CSRF setup.',
        );
        return throwError(() => error);
      }),
      finalize(() => this.busy.set(false)),
    );
  }
  logout(): Observable<void> {
    this.guard();
    this.busy.set(true);
    let invalidated = false;
    return this.http.post<void>(`${this.base}/logout`, null).pipe(
      tap(() => {
        invalidated = true;
        this.authenticated.set(false);
        this.message.set('Signed out. The server session was invalidated.');
      }),
      switchMap(() => this.bootstrap()),
      catchError((error) => {
        this.message.set(
          invalidated
            ? 'Signed out, but the CSRF token could not be refreshed. Check session before signing in.'
            : 'Logout could not be confirmed. Check the API and try again; the session may still exist.',
        );
        return throwError(() => error);
      }),
      finalize(() => this.busy.set(false)),
    );
  }
  expired(): void {
    this.authenticated.set(false);
    this.message.set('Your local session expired or was invalidated. Sign in again.');
  }
}
