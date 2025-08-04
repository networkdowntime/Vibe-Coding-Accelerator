import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService, FileItem } from '../../services/file.service';

export type FileModalMode = 'upload' | 'rename' | 'delete';

@Component({
  selector: 'app-file-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-modal.component.html',
  styleUrl: './file-modal.component.scss'
})
export class FileModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() mode: FileModalMode = 'upload';
  @Input() projectName: string = '';
  @Input() file: FileItem | null = null; // For rename/delete operations
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<any>();
  @Output() error = new EventEmitter<string>();

  // Upload mode properties
  selectedFile: File | null = null;
  dragOver: boolean = false;

  // Rename mode properties
  newFileName: string = '';

  // Common properties
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private fileService: FileService) {}

  ngOnInit(): void {
    if (this.mode === 'rename' && this.file) {
      this.newFileName = this.file.name;
    }
  }

  /**
   * Get modal title based on mode
   */
  getModalTitle(): string {
    switch (this.mode) {
      case 'upload': return 'Upload File';
      case 'rename': return 'Rename File';
      case 'delete': return 'Delete File';
      default: return 'File Operation';
    }
  }

  /**
   * Handle file selection for upload
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFileSelection(input.files[0]);
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  /**
   * Handle file drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      this.handleFileSelection(files[0]);
    }
  }

  /**
   * Handle file selection (upload or drop)
   */
  private handleFileSelection(file: File): void {
    this.errorMessage = '';

    // Validate file type
    if (!this.fileService.isSupportedFileType(file.name)) {
      this.errorMessage = 'Unsupported file type. Supported types: txt, md, yml, html, pdf';
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'File size must be less than 10MB';
      return;
    }

    this.selectedFile = file;
  }

  /**
   * Perform upload operation
   */
  performUpload(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file to upload';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.fileService.uploadFile(this.projectName, this.selectedFile)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.success.emit(response);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message;
          this.error.emit(error.message);
        }
      });
  }

  /**
   * Perform rename operation
   */
  performRename(): void {
    if (!this.file || !this.newFileName.trim()) {
      this.errorMessage = 'Please enter a new file name';
      return;
    }

    if (this.newFileName === this.file.name) {
      this.errorMessage = 'New name must be different from current name';
      return;
    }

    // Validate file type
    if (!this.fileService.isSupportedFileType(this.newFileName)) {
      this.errorMessage = 'Unsupported file type. Supported types: txt, md, yml, html, pdf';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.fileService.renameFile(this.projectName, this.file.name, this.newFileName)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.success.emit(response);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message;
          this.error.emit(error.message);
        }
      });
  }

  /**
   * Perform delete operation
   */
  performDelete(): void {
    if (!this.file) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.fileService.deleteFile(this.projectName, this.file.name)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.success.emit(response);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message;
          this.error.emit(error.message);
        }
      });
  }

  /**
   * Handle primary action (Submit/Rename/Delete)
   */
  onPrimaryAction(): void {
    switch (this.mode) {
      case 'upload':
        this.performUpload();
        break;
      case 'rename':
        this.performRename();
        break;
      case 'delete':
        this.performDelete();
        break;
    }
  }

  /**
   * Handle cancel/close
   */
  onCancel(): void {
    this.close.emit();
  }

  /**
   * Get primary button text
   */
  getPrimaryButtonText(): string {
    if (this.isLoading) return 'Processing...';
    
    switch (this.mode) {
      case 'upload': return 'Upload';
      case 'rename': return 'Rename';
      case 'delete': return 'Delete';
      default: return 'Submit';
    }
  }

  /**
   * Get primary button class
   */
  getPrimaryButtonClass(): string {
    const baseClasses = 'btn btn-primary';
    const modeClasses = {
      upload: '',
      rename: '',
      delete: 'btn-danger'
    };
    
    return `${baseClasses} ${modeClasses[this.mode]}`.trim();
  }

  /**
   * Check if primary action is disabled
   */
  isPrimaryActionDisabled(): boolean {
    if (this.isLoading) return true;

    switch (this.mode) {
      case 'upload':
        return !this.selectedFile;
      case 'rename':
        return !this.newFileName.trim() || this.newFileName === this.file?.name;
      case 'delete':
        return false;
      default:
        return true;
    }
  }

  /**
   * Reset modal state
   */
  resetModal(): void {
    this.selectedFile = null;
    this.newFileName = '';
    this.errorMessage = '';
    this.isLoading = false;
    this.dragOver = false;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    return this.fileService.formatFileSize(bytes);
  }
}
