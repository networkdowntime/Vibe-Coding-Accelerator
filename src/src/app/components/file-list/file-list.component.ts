import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FileService, FileItem } from '../../services/file.service';
import { FileModalComponent } from '../file-modal/file-modal.component';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FileModalComponent],
  templateUrl: './file-list.component.html',
  styleUrl: './file-list.component.scss'
})
export class FileListComponent implements OnInit, OnDestroy {
  @Input() projectName: string = '';
  @Output() fileUploaded = new EventEmitter<FileItem>();
  @Output() fileUpdated = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  files: FileItem[] = [];
  filteredFiles: FileItem[] = [];
  searchTerm: string = '';
  sortBy: 'name' | 'date' | 'size' | 'type' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  isLoading: boolean = false;

  // Modal states
  showUploadModal: boolean = false;
  showRenameModal: boolean = false;
  showDeleteModal: boolean = false;
  selectedFile: FileItem | null = null;

  private destroy$ = new Subject<void>();

  constructor(private fileService: FileService) {}

  ngOnInit(): void {
    if (this.projectName) {
      this.loadFiles();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load files from the server
   */
  loadFiles(): void {
    if (!this.projectName) return;

    this.isLoading = true;
    this.fileService.listFiles(this.projectName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (files) => {
          this.files = files;
          this.applyFiltersAndSort();
          this.isLoading = false;
        },
        error: (error) => {
          this.error.emit(`Failed to load files: ${error.message}`);
          this.isLoading = false;
        }
      });
  }

  /**
   * Apply search filter and sorting
   */
  applyFiltersAndSort(): void {
    let filtered = [...this.files];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredFiles = filtered;
  }

  /**
   * Handle search input change
   */
  onSearchChange(): void {
    this.applyFiltersAndSort();
  }

  /**
   * Handle sort change
   */
  onSortChange(sortBy: 'name' | 'date' | 'size' | 'type'): void {
    if (this.sortBy === sortBy) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
  }

  /**
   * Open upload modal
   */
  openUploadModal(): void {
    this.showUploadModal = true;
  }

  /**
   * Handle file upload success
   */
  onFileUploaded(file: FileItem): void {
    this.showUploadModal = false;
    this.loadFiles(); // Reload the file list
    this.fileUploaded.emit(file);
  }

  /**
   * Handle upload modal close
   */
  onUploadModalClose(): void {
    this.showUploadModal = false;
  }

  /**
   * Open file in browser
   */
  openFile(file: FileItem): void {
    const url = this.fileService.getFileUrl(this.projectName, file.name);
    window.open(url, '_blank');
  }

  /**
   * Open rename modal
   */
  openRenameModal(file: FileItem): void {
    this.selectedFile = file;
    this.showRenameModal = true;
  }

  /**
   * Handle file rename success
   */
  onFileRenamed(): void {
    this.showRenameModal = false;
    this.selectedFile = null;
    this.loadFiles(); // Reload the file list
    this.fileUpdated.emit();
  }

  /**
   * Handle rename modal close
   */
  onRenameModalClose(): void {
    this.showRenameModal = false;
    this.selectedFile = null;
  }

  /**
   * Open delete modal
   */
  openDeleteModal(file: FileItem): void {
    this.selectedFile = file;
    this.showDeleteModal = true;
  }

  /**
   * Handle file delete success
   */
  onFileDeleted(): void {
    this.showDeleteModal = false;
    this.selectedFile = null;
    this.loadFiles(); // Reload the file list
    this.fileUpdated.emit();
  }

  /**
   * Handle delete modal close
   */
  onDeleteModalClose(): void {
    this.showDeleteModal = false;
    this.selectedFile = null;
  }

  /**
   * Handle modal errors
   */
  onModalError(errorMessage: string): void {
    this.error.emit(errorMessage);
  }

  /**
   * Get file icon class
   */
  getFileIconClass(fileName: string): string {
    return this.fileService.getFileIconClass(fileName);
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    return this.fileService.formatFileSize(bytes);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Get sort arrow class
   */
  getSortArrowClass(column: string): string {
    if (this.sortBy !== column) return '';
    return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
  }
}
