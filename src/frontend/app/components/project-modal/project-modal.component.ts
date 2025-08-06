import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';

export interface ProjectModalData {
  mode: 'create' | 'rename' | 'delete';
  projectName?: string;
  projectDisplayName?: string;
}

export interface ProjectModalResult {
  action: 'create' | 'rename' | 'delete' | 'cancel';
  success?: boolean;
  error?: string;
  newProjectName?: string; // For rename operations, the new project name (directory name)
}

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-modal.component.html',
  styleUrl: './project-modal.component.scss'
})
export class ProjectModalComponent implements OnInit {
  @Input() data: ProjectModalData = { mode: 'create' };
  @Output() result = new EventEmitter<ProjectModalResult>();
  
  projectName: string = '';
  isLoading: boolean = false;
  error: string = '';

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    if (this.data.mode === 'rename' && this.data.projectDisplayName) {
      this.projectName = this.data.projectDisplayName;
    }
  }

  get title(): string {
    switch (this.data.mode) {
      case 'create': return 'Create New Project';
      case 'rename': return `Rename Project: ${this.data.projectDisplayName}`;
      case 'delete': return `Delete Project: ${this.data.projectDisplayName}`;
      default: return '';
    }
  }

  get primaryButtonText(): string {
    switch (this.data.mode) {
      case 'create': return 'Create';
      case 'rename': return 'Rename';
      case 'delete': return 'Delete';
      default: return 'OK';
    }
  }

  get primaryButtonClass(): string {
    return this.data.mode === 'delete' ? 'btn-danger' : 'btn-primary';
  }

  get isFormValid(): boolean {
    if (this.data.mode === 'delete') {
      return true; // No form validation needed for delete
    }
    return this.projectName.trim().length > 0;
  }

  onSubmit(): void {
    if (!this.isFormValid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.error = '';

    switch (this.data.mode) {
      case 'create':
        this.createProject();
        break;
      case 'rename':
        this.renameProject();
        break;
      case 'delete':
        this.deleteProject();
        break;
    }
  }

  onCancel(): void {
    this.result.emit({ action: 'cancel' });
  }

  private createProject(): void {
    this.projectService.createProject(this.projectName.trim()).subscribe({
      next: () => {
        this.result.emit({ action: 'create', success: true });
      },
      error: (error) => {
        this.error = error.message || 'Failed to create project';
        this.isLoading = false;
      }
    });
  }

  private renameProject(): void {
    if (!this.data.projectName) {
      this.error = 'Original project name is missing';
      this.isLoading = false;
      return;
    }

    this.projectService.renameProject(this.data.projectName, this.projectName.trim()).subscribe({
      next: (updatedProject) => {
        this.result.emit({ 
          action: 'rename', 
          success: true, 
          newProjectName: updatedProject.name 
        });
      },
      error: (error) => {
        this.error = error.message || 'Failed to rename project';
        this.isLoading = false;
      }
    });
  }

  private deleteProject(): void {
    if (!this.data.projectName) {
      this.error = 'Project name is missing';
      this.isLoading = false;
      return;
    }

    this.projectService.deleteProject(this.data.projectName).subscribe({
      next: () => {
        this.result.emit({ action: 'delete', success: true });
      },
      error: (error) => {
        this.error = error.message || 'Failed to delete project';
        this.isLoading = false;
      }
    });
  }

}
