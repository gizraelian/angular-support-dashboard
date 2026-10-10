import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LocalSessionService } from '../../services/local-session.service';
@Component({
  selector: 'app-local-session',
  imports: [ReactiveFormsModule],
  templateUrl: './local-session.html',
  styleUrl: '../work-orders.scss',
})
export class LocalSession {
  readonly session = inject(LocalSessionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  constructor() {
    if (this.session.enabled)
      this.session
        .recover()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => {} });
  }
  login(): void {
    if (this.form.invalid || this.session.busy()) return;
    const { username, password } = this.form.getRawValue();
    // Clear the password control immediately, on success AND failure (including pending requests).
    this.form.controls.password.reset('');
    this.session
      .login(username, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }
  logout(): void {
    if (this.session.busy()) return;
    this.form.reset();
    this.session
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }
  recover(): void {
    this.session
      .recover()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }
}
