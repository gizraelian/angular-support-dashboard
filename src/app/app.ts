import { Component } from '@angular/core';
import { LocalSession } from './features/local-session/local-session';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LocalSession],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
