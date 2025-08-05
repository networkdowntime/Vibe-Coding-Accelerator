import { Component, OnInit, OnDestroy, computed, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { Project, ProjectService, CreateProjectRequest, UpdateProjectRequest } from '../../services/project.service';
import { NotificationService } from '../../services/notification.service';
import { ProjectModalComponent, ProjectModalData, ProjectModalResult } from '../project-modal/project-modal.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-main-ui',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatToolbarModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule
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
        <!-- Search and Filter Controls -->
        <div class="controls-section">
          <div class="search-controls">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search projects</mat-label>
              <input 
                matInput 
                [(ngModel)]="searchQuery"
                (input)="onSearchChange()"
                placeholder="Search by name, description..."
                autocomplete="off">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Filter by status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="onFilterChange()">
                <mat-option value="">All Projects</mat-option>
                <mat-option value="active">Active</mat-option>
                <mat-option value="draft">Draft</mat-option>
                <mat-option value="completed">Completed</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="sort-field">
              <mat-label>Sort by</mat-label>
              <mat-select [(ngModel)]="sortBy" (selectionChange)="onSortChange()">
                <mat-option value="updatedAt">Last Modified</mat-option>
                <mat-option value="createdAt">Created Date</mat-option>
                <mat-option value="name">Name</mat-option>
                <mat-option value="status">Status</mat-option>
              </mat-select>
            </mat-form-field>

            <button 
              mat-icon-button 
              (click)="toggleSortOrder()"
              [title]="sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'">
              <mat-icon>{{ sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
            </button>
          </div>

          <button mat-raised-button color="primary" (click)="createNewProject()">
            <mat-icon>add</mat-icon>
            New Project
          </button>
        </div>

        <!-- Loading State -->
        <div class="loading-section" *ngIf="projectService.loading()">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading projects...</p>
        </div>

        <!-- Error State -->
        <div class="error-section" *ngIf="projectService.error() && !projectService.loading()">
          <mat-icon class="error-icon">error</mat-icon>
          <h3>Error Loading Projects</h3>
          <p>{{ projectService.error() }}</p>
          <button mat-raised-button color="primary" (click)="loadProjects()">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>

        <!-- Projects Grid -->
        <div class="projects-grid" *ngIf="!projectService.loading() && !projectService.error() && filteredProjects().length > 0">
          <mat-card 
            *ngFor="let project of filteredProjects()" 
            class="project-card"
            [class.active]="project.status === 'active'"
            [class.completed]="project.status === 'completed'"
            [class.draft]="project.status === 'draft'">
            
            <mat-card-header>
              <div mat-card-avatar [class]="'avatar-' + project.status">
                <mat-icon>{{ getProjectIcon(project.status) }}</mat-icon>
              </div>
              <mat-card-title>{{ project.name }}</mat-card-title>
              <mat-card-subtitle>{{ project.description || 'No description' }}</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <div class="project-meta">
                <small class="last-modified">
                  Last modified: {{ project.updatedAt | date:'medium' }}
                </small>
                <div class="status-chip">
                  <mat-chip [class]="'status-chip-' + project.status">
                    {{ project.status | titlecase }}
                  </mat-chip>
                </div>
              </div>
            </mat-card-content>

            <mat-card-actions>
              <button mat-button (click)="viewProject(project.id)">
                <mat-icon>visibility</mat-icon>
                View
              </button>
              <button mat-button [matMenuTriggerFor]="projectMenu">
                <mat-icon>more_vert</mat-icon>
                More
              </button>
              
              <mat-menu #projectMenu="matMenu">
                <button mat-menu-item (click)="editProject(project)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="renameProject(project)">
                  <mat-icon>text_fields</mat-icon>
                  <span>Rename</span>
                </button>
                <button mat-menu-item (click)="duplicateProject(project)" [disabled]="true">
                  <mat-icon>content_copy</mat-icon>
                  <span>Duplicate (Coming Soon)</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteProject(project)" class="delete-menu-item">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </mat-card-actions>
          </mat-card>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!projectService.loading() && !projectService.error() && filteredProjects().length === 0">
          <mat-icon class="empty-icon">
            {{ searchQuery || statusFilter ? 'search_off' : 'folder_open' }}
          </mat-icon>
          <h3>
            {{ searchQuery || statusFilter ? 'No matching projects found' : 'No projects yet' }}
          </h3>
          <p *ngIf="!searchQuery && !statusFilter">
            Create your first project to get started with the Vibe Coding Accelerator
          </p>
          <p *ngIf="searchQuery || statusFilter">
            Try adjusting your search or filter criteria
          </p>
          <button mat-raised-button color="primary" (click)="createNewProject()" *ngIf="!searchQuery && !statusFilter">
            <mat-icon>add</mat-icon>
            Create Your First Project
          </button>
          <button mat-stroked-button (click)="clearFilters()" *ngIf="searchQuery || statusFilter">
            <mat-icon>clear</mat-icon>
            Clear Filters
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

    /* Controls Section */
    .controls-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-controls {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
      flex: 1;
    }

    .search-field {
      min-width: 250px;
      flex: 1;
      max-width: 400px;
    }

    .filter-field, .sort-field {
      min-width: 120px;
    }

    /* Loading and Error States */
    .loading-section, .error-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: #666;
    }

    .error-section {
      color: #f44336;
    }

    .error-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      margin-bottom: 16px;
      color: #f44336;
    }

    .error-section h3 {
      margin: 0 0 8px 0;
      color: #f44336;
    }

    .error-section p {
      margin: 0 0 24px 0;
      max-width: 400px;
    }

    /* Projects Grid */
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .project-card {
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      cursor: pointer;
      position: relative;
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .last-modified {
      color: #666;
      font-size: 0.85rem;
    }

    .status-chip {
      display: flex;
      align-items: center;
    }

    .status-chip-active {
      background-color: #e8f5e8 !important;
      color: #2e7d32 !important;
    }

    .status-chip-completed {
      background-color: #e3f2fd !important;
      color: #1565c0 !important;
    }

    .status-chip-draft {
      background-color: #fff3e0 !important;
      color: #ef6c00 !important;
    }

    /* Menu Styling */
    .delete-menu-item {
      color: #f44336;
    }

    .delete-menu-item mat-icon {
      color: #f44336;
    }

    /* Empty State */
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

    .empty-state h3 {
      margin: 0 0 8px 0;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Features Section */
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

    /* Responsive Design */
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

      .controls-section {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .search-controls {
        flex-direction: column;
        gap: 12px;
      }

      .search-field {
        min-width: auto;
        max-width: none;
      }

      .projects-grid {
        grid-template-columns: 1fr;
      }

      .project-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }

    @media (max-width: 480px) {
      .main-container {
        padding: 12px;
      }

      .page-title {
        font-size: 1.8rem;
      }

      .controls-section {
        gap: 12px;
      }

      .search-controls {
        gap: 8px;
      }

      .project-card {
        margin-bottom: 16px;
      }

      .loading-section, .error-section, .empty-state {
        padding: 32px 16px;
      }
    }
  `]
})
export class MainUiComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  // View state
  isProjectsView = false;
  
  // Search and filter properties
  searchQuery = '';
  statusFilter = '';
  sortBy: keyof Project = 'updatedAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Computed properties using Angular signals
  filteredProjects = computed(() => {
    let projects = [...this.projectService.projects()];

    // Apply status filter
    if (this.statusFilter) {
      projects = projects.filter(p => p.status === this.statusFilter);
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      projects = projects.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        p.status.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    return this.projectService.sortProjects(projects, this.sortBy, this.sortOrder);
  });

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public projectService: ProjectService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Check if we're on the projects route
    this.isProjectsView = this.router.url === '/projects';
    
    // Load projects when component initializes
    if (this.isProjectsView) {
      this.loadProjects();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load projects from the backend
   */
  loadProjects(): void {
    this.projectService.loadProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Projects loaded:', response);
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.notificationService.showError('Failed to load projects. Please try again.');
        }
      });
  }

  /**
   * Handle search input changes
   */
  onSearchChange(): void {
    // The computed property will automatically update
  }

  /**
   * Handle filter changes
   */
  onFilterChange(): void {
    // The computed property will automatically update
  }

  /**
   * Handle sort changes
   */
  onSortChange(): void {
    // The computed property will automatically update
  }

  /**
   * Toggle sort order
   */
  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.sortBy = 'updatedAt';
    this.sortOrder = 'desc';
  }

  /**
   * Create a new project
   */
  createNewProject(): void {
    const dialogData: ProjectModalData = {
      mode: 'create',
      title: 'Create New Project'
    };

    const dialogRef = this.dialog.open(ProjectModalComponent, {
      width: '500px',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: ProjectModalResult | undefined) => {
      if (result && result.action === 'save' && result.data) {
        const createRequest: CreateProjectRequest = {
          name: result.data.name,
          description: result.data.description,
          status: result.data.status as 'active' | 'draft'
        };

        this.projectService.createProject(createRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (project) => {
              this.notificationService.showSuccess(`Project "${project.name}" created successfully!`);
              // Auto-navigate to the new project after a short delay
              setTimeout(() => {
                this.router.navigate(['/project', project.id]);
              }, 1000);
            },
            error: (error) => {
              console.error('Error creating project:', error);
              this.notificationService.showError('Failed to create project. Please try again.');
            }
          });
      }
    });
  }

  /**
   * Navigate to projects view
   */
  viewProjects(): void {
    this.router.navigate(['/projects']);
  }

  /**
   * View a specific project
   */
  viewProject(id: string): void {
    this.router.navigate(['/project', id]);
  }

  /**
   * Edit a project
   */
  editProject(project: Project): void {
    const dialogData: ProjectModalData = {
      mode: 'edit',
      project: project,
      title: `Edit Project: ${project.name}`
    };

    const dialogRef = this.dialog.open(ProjectModalComponent, {
      width: '500px',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: ProjectModalResult | undefined) => {
      if (result && result.action === 'save' && result.data) {
        const updateRequest: UpdateProjectRequest = {
          name: result.data.name,
          description: result.data.description,
          status: result.data.status
        };

        this.projectService.updateProject(project.id, updateRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updatedProject) => {
              this.notificationService.showSuccess(`Project "${updatedProject.name}" updated successfully!`);
            },
            error: (error) => {
              console.error('Error updating project:', error);
              this.notificationService.showError('Failed to update project. Please try again.');
            }
          });
      }
    });
  }

  /**
   * Rename a project
   */
  renameProject(project: Project): void {
    const dialogData: ProjectModalData = {
      mode: 'rename',
      project: project,
      title: `Rename Project: ${project.name}`
    };

    const dialogRef = this.dialog.open(ProjectModalComponent, {
      width: '400px',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: ProjectModalResult | undefined) => {
      if (result && result.action === 'save' && result.data) {
        const updateRequest: UpdateProjectRequest = {
          name: result.data.name
        };

        this.projectService.updateProject(project.id, updateRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updatedProject) => {
              this.notificationService.showSuccess(`Project renamed to "${updatedProject.name}" successfully!`);
            },
            error: (error) => {
              console.error('Error renaming project:', error);
              this.notificationService.showError('Failed to rename project. Please try again.');
            }
          });
      }
    });
  }

  /**
   * Duplicate a project (placeholder)
   */
  duplicateProject(project: Project): void {
    this.notificationService.showInfo('Project duplication feature coming soon!');
  }

  /**
   * Delete a project with confirmation
   */
  deleteProject(project: Project): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      icon: 'delete_forever'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.projectService.deleteProject(project.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess(`Project "${project.name}" deleted successfully.`);
            },
            error: (error) => {
              console.error('Error deleting project:', error);
              this.notificationService.showError('Failed to delete project. Please try again.');
            }
          });
      }
    });
  }

  /**
   * Get icon for project status
   */
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
