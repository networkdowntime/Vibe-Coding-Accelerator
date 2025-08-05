import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Project } from '../../services/project.service';

export interface ProjectModalData {
  mode: 'create' | 'edit' | 'rename';
  project?: Project;
  title?: string;
}

export interface ProjectModalResult {
  action: 'save' | 'cancel';
  data?: {
    name: string;
    description?: string;
    status?: 'active' | 'completed' | 'draft';
  };
}

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="project-modal">
      <h2 mat-dialog-title>{{ getTitle() }}</h2>
      
      <mat-dialog-content>
        <form [formGroup]="projectForm" class="project-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Project Name</mat-label>
            <input 
              matInput 
              formControlName="name"
              placeholder="Enter project name"
              [readonly]="loading"
              maxlength="100">
            <mat-error *ngIf="projectForm.get('name')?.hasError('required')">
              Project name is required
            </mat-error>
            <mat-error *ngIf="projectForm.get('name')?.hasError('minlength')">
              Project name must be at least 2 characters
            </mat-error>
            <mat-error *ngIf="projectForm.get('name')?.hasError('maxlength')">
              Project name cannot exceed 100 characters
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.mode !== 'rename'">
            <mat-label>Description</mat-label>
            <textarea 
              matInput 
              formControlName="description"
              placeholder="Enter project description (optional)"
              [readonly]="loading"
              rows="3"
              maxlength="500">
            </textarea>
            <mat-error *ngIf="projectForm.get('description')?.hasError('maxlength')">
              Description cannot exceed 500 characters
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.mode !== 'rename'">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status" [disabled]="loading">
              <mat-option value="draft">Draft</mat-option>
              <mat-option value="active">Active</mat-option>
              <mat-option value="completed" *ngIf="data.mode === 'edit'">Completed</mat-option>
            </mat-select>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button 
          mat-button 
          (click)="onCancel()"
          [disabled]="loading">
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary"
          (click)="onSave()"
          [disabled]="!projectForm.valid || loading">
          <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
          <span *ngIf="!loading">{{ getSaveButtonText() }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .project-modal {
      min-width: 400px;
      max-width: 600px;
    }

    .project-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 16px 0;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-title {
      margin-bottom: 0;
      font-weight: 500;
    }

    mat-dialog-content {
      padding: 0 24px;
      min-height: 120px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      margin-bottom: 0;
    }

    mat-spinner {
      margin-right: 8px;
    }

    button[mat-raised-button] {
      min-width: 100px;
    }

    @media (max-width: 480px) {
      .project-modal {
        min-width: 320px;
        max-width: 90vw;
      }
      
      mat-dialog-content {
        padding: 0 16px;
      }
      
      mat-dialog-actions {
        padding: 16px;
      }
    }
  `]
})
export class ProjectModalComponent implements OnInit {
  projectForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProjectModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProjectModalData
  ) {
    this.projectForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data.project) {
      this.populateForm(this.data.project);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]],
      status: ['draft']
    });
  }

  private populateForm(project: Project): void {
    this.projectForm.patchValue({
      name: project.name,
      description: project.description || '',
      status: project.status
    });
  }

  getTitle(): string {
    if (this.data.title) {
      return this.data.title;
    }

    switch (this.data.mode) {
      case 'create':
        return 'Create New Project';
      case 'edit':
        return 'Edit Project';
      case 'rename':
        return 'Rename Project';
      default:
        return 'Project';
    }
  }

  getSaveButtonText(): string {
    switch (this.data.mode) {
      case 'create':
        return 'Create';
      case 'edit':
        return 'Save Changes';
      case 'rename':
        return 'Rename';
      default:
        return 'Save';
    }
  }

  onSave(): void {
    if (this.projectForm.valid && !this.loading) {
      this.loading = true;

      const formValue = this.projectForm.value;
      const result: ProjectModalResult = {
        action: 'save',
        data: {
          name: formValue.name.trim(),
          description: formValue.description?.trim() || undefined,
          status: this.data.mode === 'rename' ? undefined : formValue.status
        }
      };

      // Simulate a brief delay to show loading state
      setTimeout(() => {
        this.dialogRef.close(result);
      }, 300);
    }
  }

  onCancel(): void {
    const result: ProjectModalResult = {
      action: 'cancel'
    };
    this.dialogRef.close(result);
  }
}
