import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService, ProjectFile, FileUploadProgress } from '../../services/file.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss']
})
export class FileListComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;

  private destroy$ = new Subject<void>();
  
  // Component state
  public showUploadArea = signal<boolean>(false);
  public showFileViewer = signal<boolean>(false);
  public selectedFile = signal<ProjectFile | null>(null);
  public fileContent = signal<string>('');
  public showDeleteConfirmation = signal<boolean>(false);
  public fileToDelete = signal<ProjectFile | null>(null);
  public showRenameDialog = signal<boolean>(false);
  public fileToRename = signal<ProjectFile | null>(null);
  public newFileName = signal<string>('');

  // Computed properties
  public files = computed(() => this.fileService.files());
  public uploadProgress = computed(() => this.fileService.uploadProgress());
  public isLoading = computed(() => this.fileService.isLoading());
  public error = computed(() => this.fileService.error());
  public hasFiles = computed(() => this.files().length > 0);
  public isUploading = computed(() => 
    this.uploadProgress().some(p => p.status === 'uploading')
  );

  constructor(private fileService: FileService) {}

  ngOnInit(): void {
    if (this.projectId) {
      this.loadFiles();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load files for the current project
   */
  loadFiles(): void {
    this.fileService.getProjectFiles(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Failed to load files:', error);
        }
      });
  }

  /**
   * Handle file selection for upload
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(input.files);
      // Reset input
      input.value = '';
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle file drop
   */
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.uploadFiles(event.dataTransfer.files);
    }
  }

  /**
   * Upload selected files
   */
  private uploadFiles(files: FileList): void {
    this.fileService.uploadFiles(this.projectId, files)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        complete: () => {
          // Clear upload progress after a delay to show completion
          setTimeout(() => {
            this.fileService.clearUploadProgress();
          }, 2000);
        },
        error: (error) => {
          console.error('Upload failed:', error);
        }
      });
  }

  /**
   * View file content
   */
  viewFile(file: ProjectFile): void {
    if (this.fileService.isFileViewable(file.filename)) {
      this.selectedFile.set(file);
      this.fileService.getFileContent(this.projectId, file.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (content) => {
            this.fileContent.set(content);
            this.showFileViewer.set(true);
          },
          error: (error) => {
            console.error('Failed to load file content:', error);
          }
        });
    } else {
      // Download file if not viewable
      this.downloadFile(file);
    }
  }

  /**
   * Download file
   */
  downloadFile(file: ProjectFile): void {
    this.fileService.downloadFile(this.projectId, file.id, file.filename)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Download failed:', error);
        }
      });
  }

  /**
   * Show delete confirmation
   */
  confirmDeleteFile(file: ProjectFile): void {
    this.fileToDelete.set(file);
    this.showDeleteConfirmation.set(true);
  }

  /**
   * Delete file
   */
  deleteFile(): void {
    const file = this.fileToDelete();
    if (file) {
      this.fileService.deleteFile(this.projectId, file.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          complete: () => {
            this.showDeleteConfirmation.set(false);
            this.fileToDelete.set(null);
          },
          error: (error) => {
            console.error('Delete failed:', error);
          }
        });
    }
  }

  /**
   * Show rename dialog
   */
  startRenameFile(file: ProjectFile): void {
    this.fileToRename.set(file);
    this.newFileName.set(file.filename);
    this.showRenameDialog.set(true);
  }

  /**
   * Rename file
   */
  renameFile(): void {
    const file = this.fileToRename();
    const newName = this.newFileName().trim();
    
    if (file && newName && newName !== file.filename) {
      this.fileService.renameFile(this.projectId, file.id, newName)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          complete: () => {
            this.showRenameDialog.set(false);
            this.fileToRename.set(null);
            this.newFileName.set('');
          },
          error: (error) => {
            console.error('Rename failed:', error);
          }
        });
    }
  }

  /**
   * Close file viewer
   */
  closeFileViewer(): void {
    this.showFileViewer.set(false);
    this.selectedFile.set(null);
    this.fileContent.set('');
  }

  /**
   * Cancel delete confirmation
   */
  cancelDelete(): void {
    this.showDeleteConfirmation.set(false);
    this.fileToDelete.set(null);
  }

  /**
   * Cancel rename dialog
   */
  cancelRename(): void {
    this.showRenameDialog.set(false);
    this.fileToRename.set(null);
    this.newFileName.set('');
  }

  /**
   * Toggle upload area
   */
  toggleUploadArea(): void {
    this.showUploadArea.update(show => !show);
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.fileService.clearError();
  }

  /**
   * Get file icon
   */
  getFileIcon(filename: string): string {
    return this.fileService.getFileIcon(filename);
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    return this.fileService.formatFileSize(bytes);
  }

  /**
   * Check if file is viewable
   */
  isFileViewable(filename: string): boolean {
    return this.fileService.isFileViewable(filename);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
