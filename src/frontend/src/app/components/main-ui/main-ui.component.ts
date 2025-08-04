import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'draft';
  lastModified: Date;
  tags: string[];
}

@Component({
  selector: 'app-main-ui',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatToolbarModule,
    MatChipsModule
  ],
  template: `
    <div class="main-container">
      <div class="header-section">
        <h1 class="page-title">
          <mat-icon class="title-icon">dashboard</mat-icon>
          {{ isProjectsView ? 'Projects Dashboard' : 'Welcome to Vibe Coding Accelerator' }}
        </h1>
        <p class="page-subtitle">
          {{ isProjectsView ? 'Manage and track your development projects' : 'Accelerate your software development with AI-powered assistance' }}
        </p>
      </div>

      <div class="actions-section" *ngIf="!isProjectsView">
        <mat-card class="welcome-card">
          <mat-card-header>
            <mat-card-title>Get Started</mat-card-title>
            <mat-card-subtitle>Create your first project or explore existing ones</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="action-buttons">
              <button mat-raised-button color="primary" (click)="createNewProject()">
                <mat-icon>add</mat-icon>
                Create New Project
              </button>
              <button mat-stroked-button (click)="viewProjects()">
                <mat-icon>folder_open</mat-icon>
                View All Projects
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="projects-section" *ngIf="isProjectsView">
        <div class="projects-header">
          <h2>Your Projects</h2>
          <button mat-fab color="primary" (click)="createNewProject()" class="fab-button">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        <div class="projects-grid" *ngIf="projects.length > 0">
          <mat-card 
            *ngFor="let project of projects" 
            class="project-card"
            [class.active]="project.status === 'active'"
            [class.completed]="project.status === 'completed'"
            [class.draft]="project.status === 'draft'">
            
            <mat-card-header>
              <div mat-card-avatar [class]="'avatar-' + project.status">
                <mat-icon>{{ getProjectIcon(project.status) }}</mat-icon>
              </div>
              <mat-card-title>{{ project.name }}</mat-card-title>
              <mat-card-subtitle>{{ project.description }}</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <div class="project-meta">
                <small class="last-modified">
                  Last modified: {{ project.lastModified | date:'medium' }}
                </small>
                <div class="project-tags">
                  <mat-chip-set>
                    <mat-chip *ngFor="let tag of project.tags">{{ tag }}</mat-chip>
                  </mat-chip-set>
                </div>
              </div>
            </mat-card-content>

            <mat-card-actions>
              <button mat-button (click)="viewProject(project.id)">
                <mat-icon>visibility</mat-icon>
                View
              </button>
              <button mat-button (click)="editProject(project.id)">
                <mat-icon>edit</mat-icon>
                Edit
              </button>
            </mat-card-actions>
          </mat-card>
        </div>

        <div class="empty-state" *ngIf="projects.length === 0">
          <mat-icon class="empty-icon">folder_open</mat-icon>
          <h3>No projects yet</h3>
          <p>Create your first project to get started with the Vibe Coding Accelerator</p>
          <button mat-raised-button color="primary" (click)="createNewProject()">
            <mat-icon>add</mat-icon>
            Create Your First Project
          </button>
        </div>
      </div>

      <div class="features-section" *ngIf="!isProjectsView">
        <h2>Key Features</h2>
        <div class="features-grid">
          <mat-card class="feature-card">
            <mat-card-header>
              <div mat-card-avatar class="feature-avatar">
                <mat-icon>smart_toy</mat-icon>
              </div>
              <mat-card-title>AI-Powered Assistance</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              Integration with multiple LLM providers for intelligent code generation and review
            </mat-card-content>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <div mat-card-avatar class="feature-avatar">
                <mat-icon>description</mat-icon>
              </div>
              <mat-card-title>Document Management</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              Centralized management of project documentation, requirements, and technical specifications
            </mat-card-content>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <div mat-card-avatar class="feature-avatar">
                <mat-icon>assessment</mat-icon>
              </div>
              <mat-card-title>Quality Assurance</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              Automated consistency checks and comprehensive traceability reporting
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .main-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-section {
      margin-bottom: 32px;
      text-align: center;
    }

    .page-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 0 0 8px 0;
      font-size: 2.5rem;
      font-weight: 300;
      color: #1976d2;
    }

    .title-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
    }

    .page-subtitle {
      font-size: 1.1rem;
      color: #666;
      margin: 0;
    }

    .actions-section {
      margin-bottom: 48px;
    }

    .welcome-card {
      max-width: 600px;
      margin: 0 auto;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .projects-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .projects-header h2 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 400;
    }

    .fab-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .project-card {
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      cursor: pointer;
    }

    .project-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .project-card.active {
      border-left: 4px solid #4caf50;
    }

    .project-card.completed {
      border-left: 4px solid #2196f3;
    }

    .project-card.draft {
      border-left: 4px solid #ff9800;
    }

    .avatar-active {
      background-color: #4caf50;
      color: white;
    }

    .avatar-completed {
      background-color: #2196f3;
      color: white;
    }

    .avatar-draft {
      background-color: #ff9800;
      color: white;
    }

    .project-meta {
      margin-top: 16px;
    }

    .last-modified {
      color: #666;
      font-size: 0.85rem;
    }

    .project-tags {
      margin-top: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #666;
    }

    .empty-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #ccc;
      margin-bottom: 16px;
    }

    .features-section {
      margin-top: 48px;
    }

    .features-section h2 {
      text-align: center;
      margin-bottom: 32px;
      font-size: 1.8rem;
      font-weight: 400;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .feature-card {
      text-align: center;
    }

    .feature-avatar {
      background-color: #1976d2;
      color: white;
    }

    @media (max-width: 768px) {
      .main-container {
        padding: 16px;
      }

      .page-title {
        font-size: 2rem;
        flex-direction: column;
        gap: 4px;
      }

      .title-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }

      .action-buttons {
        flex-direction: column;
      }

      .projects-grid {
        grid-template-columns: 1fr;
      }

      .projects-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }

      .fab-button {
        position: static;
        margin-top: 16px;
      }
    }
  `]
})
export class MainUiComponent implements OnInit {
  isProjectsView = false;
  projects: Project[] = [
    {
      id: '1',
      name: 'E-commerce Platform',
      description: 'Modern React-based e-commerce solution',
      status: 'active',
      lastModified: new Date('2025-08-04T10:30:00'),
      tags: ['React', 'TypeScript', 'Node.js']
    },
    {
      id: '2',
      name: 'Mobile Banking App',
      description: 'Secure mobile banking application',
      status: 'completed',
      lastModified: new Date('2025-08-01T15:45:00'),
      tags: ['Flutter', 'Firebase', 'Security']
    },
    {
      id: '3',
      name: 'Analytics Dashboard',
      description: 'Real-time analytics and reporting dashboard',
      status: 'draft',
      lastModified: new Date('2025-08-03T09:15:00'),
      tags: ['Angular', 'D3.js', 'Python']
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check if we're on the projects route
    this.isProjectsView = this.router.url === '/projects';
  }

  createNewProject(): void {
    // TODO: Implement project creation logic
    console.log('Creating new project...');
    // For now, navigate to a placeholder
    this.router.navigate(['/project/new/edit']);
  }

  viewProjects(): void {
    this.router.navigate(['/projects']);
  }

  viewProject(id: string): void {
    this.router.navigate(['/project', id]);
  }

  editProject(id: string): void {
    this.router.navigate(['/project', id, 'edit']);
  }

  getProjectIcon(status: string): string {
    switch (status) {
      case 'active':
        return 'play_circle';
      case 'completed':
        return 'check_circle';
      case 'draft':
        return 'edit';
      default:
        return 'folder';
    }
  }
}
