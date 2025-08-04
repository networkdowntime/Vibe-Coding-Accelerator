import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

interface ProjectDetails {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'draft';
  progress: number;
  createdDate: Date;
  lastModified: Date;
  tags: string[];
  files: ProjectFile[];
  tasks: ProjectTask[];
}

interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: Date;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
}

interface ProjectTask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignee?: string;
  dueDate?: Date;
}

@Component({
  selector: 'app-project-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressBarModule
  ],
  template: `
    <div class="project-container" *ngIf="project">
      <!-- Header Section -->
      <div class="project-header">
        <div class="header-content">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          
          <div class="project-info">
            <h1 class="project-title">
              {{ isEditMode ? 'Edit Project' : project.name }}
            </h1>
            <div class="project-meta">
              <span class="status-chip" [class]="'status-' + project.status">
                {{ project.status | titlecase }}
              </span>
              <span class="project-id">ID: {{ project.id }}</span>
              <span class="last-modified">
                Modified: {{ project.lastModified | date:'short' }}
              </span>
            </div>
          </div>
          
          <div class="header-actions">
            <button mat-stroked-button *ngIf="!isEditMode" (click)="toggleEditMode()">
              <mat-icon>edit</mat-icon>
              Edit
            </button>
            <button mat-raised-button color="primary" *ngIf="isEditMode" (click)="saveProject()">
              <mat-icon>save</mat-icon>
              Save
            </button>
            <button mat-button *ngIf="isEditMode" (click)="cancelEdit()">
              Cancel
            </button>
          </div>
        </div>
        
        <mat-progress-bar 
          mode="determinate" 
          [value]="project.progress" 
          class="progress-bar">
        </mat-progress-bar>
      </div>

      <!-- Content Tabs -->
      <mat-tab-group class="project-tabs" dynamicHeight>
        <!-- Overview Tab -->
        <mat-tab label="Overview">
          <div class="tab-content">
            <div class="overview-grid">
              <mat-card class="overview-card">
                <mat-card-header>
                  <mat-card-title>Project Details</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="detail-row" *ngIf="!isEditMode">
                    <strong>Name:</strong>
                    <span>{{ project.name }}</span>
                  </div>
                  <mat-form-field *ngIf="isEditMode" class="full-width">
                    <mat-label>Project Name</mat-label>
                    <input matInput [(ngModel)]="project.name">
                  </mat-form-field>

                  <div class="detail-row" *ngIf="!isEditMode">
                    <strong>Description:</strong>
                    <span>{{ project.description }}</span>
                  </div>
                  <mat-form-field *ngIf="isEditMode" class="full-width">
                    <mat-label>Description</mat-label>
                    <textarea matInput rows="3" [(ngModel)]="project.description"></textarea>
                  </mat-form-field>

                  <div class="detail-row" *ngIf="!isEditMode">
                    <strong>Status:</strong>
                    <span class="status-chip" [class]="'status-' + project.status">
                      {{ project.status | titlecase }}
                    </span>
                  </div>
                  <mat-form-field *ngIf="isEditMode" class="full-width">
                    <mat-label>Status</mat-label>
                    <mat-select [(ngModel)]="project.status">
                      <mat-option value="draft">Draft</mat-option>
                      <mat-option value="active">Active</mat-option>
                      <mat-option value="completed">Completed</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <div class="detail-row">
                    <strong>Progress:</strong>
                    <span>{{ project.progress }}%</span>
                  </div>

                  <div class="detail-row">
                    <strong>Created:</strong>
                    <span>{{ project.createdDate | date:'medium' }}</span>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="overview-card">
                <mat-card-header>
                  <mat-card-title>Tags</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <mat-chip-set class="tag-chips" *ngIf="!isEditMode">
                    <mat-chip *ngFor="let tag of project.tags">{{ tag }}</mat-chip>
                  </mat-chip-set>
                  <div *ngIf="isEditMode">
                    <mat-form-field class="full-width">
                      <mat-label>Tags (comma-separated)</mat-label>
                      <input matInput [value]="project.tags.join(', ')" 
                             (input)="updateTags($event)">
                    </mat-form-field>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Files Tab -->
        <mat-tab label="Files">
          <div class="tab-content">
            <div class="files-header">
              <h3>Project Files</h3>
              <button mat-raised-button color="primary">
                <mat-icon>upload</mat-icon>
                Upload Files
              </button>
            </div>

            <div class="files-list" *ngIf="project.files.length > 0">
              <mat-card *ngFor="let file of project.files" class="file-card">
                <mat-card-content>
                  <div class="file-info">
                    <mat-icon class="file-icon">{{ getFileIcon(file.type) }}</mat-icon>
                    <div class="file-details">
                      <h4>{{ file.name }}</h4>
                      <p>{{ formatFileSize(file.size) }} • {{ file.uploadDate | date:'short' }}</p>
                    </div>
                    <div class="file-status">
                      <span class="status-indicator" [class]="'status-' + file.status">
                        {{ file.status | titlecase }}
                      </span>
                    </div>
                    <div class="file-actions">
                      <button mat-icon-button>
                        <mat-icon>download</mat-icon>
                      </button>
                      <button mat-icon-button color="warn">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <div class="empty-state" *ngIf="project.files.length === 0">
              <mat-icon class="empty-icon">cloud_upload</mat-icon>
              <h3>No files uploaded</h3>
              <p>Upload project files to get started with AI-powered analysis</p>
              <button mat-raised-button color="primary">
                <mat-icon>upload</mat-icon>
                Upload Your First File
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- Tasks Tab -->
        <mat-tab label="Tasks">
          <div class="tab-content">
            <div class="tasks-header">
              <h3>Project Tasks</h3>
              <button mat-raised-button color="primary">
                <mat-icon>add</mat-icon>
                Add Task
              </button>
            </div>

            <div class="tasks-list" *ngIf="project.tasks.length > 0">
              <mat-card *ngFor="let task of project.tasks" class="task-card">
                <mat-card-content>
                  <div class="task-info">
                    <mat-icon 
                      class="task-status-icon" 
                      [class]="'status-' + task.status">
                      {{ getTaskIcon(task.status) }}
                    </mat-icon>
                    <div class="task-details">
                      <h4>{{ task.title }}</h4>
                      <p *ngIf="task.assignee">Assigned to: {{ task.assignee }}</p>
                      <p *ngIf="task.dueDate">Due: {{ task.dueDate | date:'short' }}</p>
                    </div>
                    <div class="task-actions">
                      <button mat-icon-button>
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <div class="empty-state" *ngIf="project.tasks.length === 0">
              <mat-icon class="empty-icon">assignment</mat-icon>
              <h3>No tasks created</h3>
              <p>Create tasks to track project progress and milestones</p>
              <button mat-raised-button color="primary">
                <mat-icon>add</mat-icon>
                Create Your First Task
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- AI Analysis Tab -->
        <mat-tab label="AI Analysis">
          <div class="tab-content">
            <div class="analysis-section">
              <mat-card class="analysis-card">
                <mat-card-header>
                  <mat-card-title>AI-Powered Analysis</mat-card-title>
                  <mat-card-subtitle>Generate insights and suggestions for your project</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="analysis-actions">
                    <button mat-raised-button color="primary">
                      <mat-icon>auto_awesome</mat-icon>
                      Analyze Code Quality
                    </button>
                    <button mat-raised-button color="accent">
                      <mat-icon>description</mat-icon>
                      Generate Documentation
                    </button>
                    <button mat-stroked-button>
                      <mat-icon>bug_report</mat-icon>
                      Find Issues
                    </button>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="results-card">
                <mat-card-header>
                  <mat-card-title>Analysis Results</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="empty-state">
                    <mat-icon class="empty-icon">analytics</mat-icon>
                    <h3>No analysis run yet</h3>
                    <p>Run an AI analysis to get insights about your project</p>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Loading state -->
    <div class="loading-container" *ngIf="!project">
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      <p>Loading project details...</p>
    </div>
  `,
  styles: [`
    .project-container {
      padding: 0;
      min-height: calc(100vh - 64px);
    }

    .project-header {
      background: white;
      border-bottom: 1px solid #e0e0e0;
      padding: 24px;
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .back-button {
      margin-top: 4px;
    }

    .project-info {
      flex: 1;
    }

    .project-title {
      margin: 0 0 8px 0;
      font-size: 2rem;
      font-weight: 400;
      color: #1976d2;
    }

    .project-meta {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .status-chip {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-active {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-completed {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .status-draft {
      background-color: #fff3e0;
      color: #ef6c00;
    }

    .project-id, .last-modified {
      color: #666;
      font-size: 0.875rem;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .progress-bar {
      margin-top: 16px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }

    .project-tabs {
      max-width: 1200px;
      margin: 0 auto;
    }

    .tab-content {
      padding: 24px;
    }

    .overview-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    .overview-card {
      height: fit-content;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f5f5f5;
    }

    .detail-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .tag-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .files-header, .tasks-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .files-header h3, .tasks-header h3 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 400;
    }

    .files-list, .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .file-card, .task-card {
      transition: transform 0.2s ease-in-out;
    }

    .file-card:hover, .task-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .file-info, .task-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .file-icon, .task-status-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #1976d2;
    }

    .file-details, .task-details {
      flex: 1;
    }

    .file-details h4, .task-details h4 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      font-weight: 500;
    }

    .file-details p, .task-details p {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }

    .file-status {
      margin-right: 16px;
    }

    .status-indicator {
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-uploaded {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-processing {
      background-color: #fff3e0;
      color: #ef6c00;
    }

    .status-processed {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .status-error {
      background-color: #ffebee;
      color: #c62828;
    }

    .status-pending {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .status-in-progress {
      background-color: #fff3e0;
      color: #ef6c00;
    }

    .file-actions, .task-actions {
      display: flex;
      gap: 4px;
    }

    .analysis-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .analysis-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
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

    .loading-container {
      padding: 48px 24px;
      text-align: center;
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 16px;
      }

      .project-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .header-actions {
        align-self: flex-end;
      }

      .overview-grid {
        grid-template-columns: 1fr;
      }

      .files-header, .tasks-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }

      .analysis-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ProjectViewComponent implements OnInit {
  project: ProjectDetails | null = null;
  isEditMode = false;
  originalProject: ProjectDetails | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.data['mode'];
    
    if (mode === 'edit') {
      this.isEditMode = true;
    }

    if (projectId) {
      this.loadProject(projectId);
    }
  }

  loadProject(id: string): void {
    // Mock project data - in real app, this would come from a service
    this.project = {
      id: id,
      name: id === 'new' ? 'New Project' : `Project ${id}`,
      description: id === 'new' ? 'Enter project description...' : 'Sample project description for demonstration',
      status: 'active',
      progress: id === 'new' ? 0 : Math.floor(Math.random() * 100),
      createdDate: new Date('2025-08-01'),
      lastModified: new Date(),
      tags: id === 'new' ? [] : ['Angular', 'TypeScript', 'Material'],
      files: id === 'new' ? [] : [
        {
          id: '1',
          name: 'project-requirements.md',
          type: 'markdown',
          size: 15360,
          uploadDate: new Date('2025-08-02'),
          status: 'processed'
        },
        {
          id: '2',
          name: 'architecture-diagram.png',
          type: 'image',
          size: 2048000,
          uploadDate: new Date('2025-08-03'),
          status: 'uploaded'
        }
      ],
      tasks: id === 'new' ? [] : [
        {
          id: '1',
          title: 'Setup project structure',
          status: 'completed',
          assignee: 'Developer',
          dueDate: new Date('2025-08-05')
        },
        {
          id: '2',
          title: 'Implement user authentication',
          status: 'in-progress',
          assignee: 'Developer',
          dueDate: new Date('2025-08-10')
        },
        {
          id: '3',
          title: 'Design user interface',
          status: 'pending',
          dueDate: new Date('2025-08-15')
        }
      ]
    };

    // Store original for cancel functionality
    this.originalProject = JSON.parse(JSON.stringify(this.project));
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode && this.project) {
      this.originalProject = JSON.parse(JSON.stringify(this.project));
    }
  }

  saveProject(): void {
    // TODO: Implement save logic
    console.log('Saving project:', this.project);
    this.isEditMode = false;
    // In real app, make API call here
  }

  cancelEdit(): void {
    if (this.originalProject) {
      this.project = JSON.parse(JSON.stringify(this.originalProject));
    }
    this.isEditMode = false;
  }

  updateTags(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.project) {
      this.project.tags = input.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
  }

  getFileIcon(fileType: string): string {
    switch (fileType) {
      case 'markdown':
        return 'article';
      case 'image':
        return 'image';
      case 'document':
        return 'description';
      case 'code':
        return 'code';
      default:
        return 'insert_drive_file';
    }
  }

  getTaskIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'check_circle';
      case 'in-progress':
        return 'schedule';
      case 'pending':
        return 'radio_button_unchecked';
      default:
        return 'assignment';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
