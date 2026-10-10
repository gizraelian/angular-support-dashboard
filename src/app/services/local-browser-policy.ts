import { InjectionToken, isDevMode } from '@angular/core';
import { LOCAL_BROWSER_BUILD } from './local-browser-build';
export function browserSessionAllowed(build: boolean, dev: boolean, origin: string): boolean {
  return build && dev && origin === 'http://127.0.0.1:4200';
}
export function approvedBrowserRuntime(): boolean {
  return browserSessionAllowed(LOCAL_BROWSER_BUILD, isDevMode(), globalThis.location?.origin ?? '');
}
export const LOCAL_BROWSER_ENABLED = new InjectionToken<boolean>('Local browser authentication', {
  providedIn: 'root',
  factory: approvedBrowserRuntime,
});
