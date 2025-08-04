import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ProjectModalData {
  mode: 'create' | 'rename' | 'delete';
  projectName?: string;
  projectDisplayName?: string;
}

export interface ProjectModalResult {
  action: 'create' | 'rename' | 'delete' | 'cancel';
  name?: string;
}

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-modal.component.html',
  styleUrl: './project-modal.component.scss'
})
export class ProjectModalComponent {
  @Input() data: ProjectModalData = { mode: 'create' };
  
  projectName: string = '';
  isLoading: boolean = false;
  error: string = '';

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

    // Emit result through a custom event that parent can listen to
    const result: ProjectModalResult = {
      action: this.data.mode,
      name: this.data.mode !== 'delete' ? this.projectName.trim() : undefined
    };

    // Simulate the modal result being handled by parent
    this.handleResult(result);
  }

  onCancel(): void {
    const result: ProjectModalResult = { action: 'cancel' };
    this.handleResult(result);
  }

  private handleResult(result: ProjectModalResult): void {
    // This would typically be handled by a modal service or parent component
    // For now, we'll use a custom event
    const event = new CustomEvent('modalResult', { detail: result });
    window.dispatchEvent(event);
  }

  setLoading(loading: boolean): void {
    this.isLoading = loading;
  }

  setError(error: string): void {
    this.error = error;
    this.isLoading = false;
  }
}
