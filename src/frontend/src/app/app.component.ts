import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <mat-icon class="app-icon">rocket_launch</mat-icon>
      <span class="app-title">Vibe Coding Accelerator</span>
      <span class="spacer"></span>
      <button mat-button routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
        <mat-icon>home</mat-icon>
        Home
      </button>
      <button mat-button routerLink="/projects" routerLinkActive="active">
        <mat-icon>folder</mat-icon>
        Projects
      </button>
    </mat-toolbar>
    
    <main class="app-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .app-icon {
      margin-right: 8px;
    }
    
    .app-title {
      font-size: 1.2rem;
      font-weight: 500;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .app-content {
      min-height: calc(100vh - 64px);
      background-color: #fafafa;
    }
    
    button[mat-button] {
      margin-left: 8px;
    }
    
    button[mat-button].active {
      background-color: rgba(255,255,255,0.1);
    }
  `]
})
export class AppComponent {
  title = 'Vibe Coding Accelerator';
}
