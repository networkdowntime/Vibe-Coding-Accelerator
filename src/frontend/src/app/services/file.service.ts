import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ProjectFile {
  id: string;
  name: string;
  originalName: string;
  type: string;
  mimeType: string;
  size: number;
  formattedSize: string;
  uploadDate: string;
  modifiedDate: string;
  status: string;
  path?: string;
  description?: string;
}

export interface FileListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProjectFile[];
  meta: {
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  timestamp: string;
}

export interface SingleFileResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProjectFile;
  meta: {};
  timestamp: string;
}

export interface FileContentResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    content: string;
    mimeType: string;
    encoding: string;
  };
  meta: {};
  timestamp: string;
}

export interface FileUploadResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProjectFile[];
  meta: {};
  timestamp: string;
}

export interface FileUploadProgress {
  name: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface FilesListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProjectFile[];
  meta: {
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  timestamp: string;
}

export interface SingleFileResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProjectFile;
  meta: {};
  timestamp: string;
}

export interface FileContentResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    content: string;
    mimeType: string;
    encoding: string;
  };
  meta: {};
  timestamp: string;
}

export interface FileUploadResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProjectFile[];
  meta: {};
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly baseUrl = 'http://localhost:3001/api/v1/files/projects';
  
  // Signal-based state management
  public files = signal<ProjectFile[]>([]);
  public uploadProgress = signal<FileUploadProgress[]>([]);
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Get all files for a project
   */
  getProjectFiles(projectId: string): Observable<ProjectFile[]> {
    return this.http.get<FilesListResponse>(`${this.baseUrl}/${projectId}`).pipe(
      map(response => response.data),
      tap(files => {
        this.files.set(files);
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        const errorMessage = this.getErrorMessage(error);
        this.error.set(errorMessage);
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Upload files to a project with progress tracking
   */
  uploadFiles(projectId: string, files: FileList): Observable<FileUploadProgress[]> {
    const formData = new FormData();
    const fileArray = Array.from(files);
    
    // Add all files to FormData
    fileArray.forEach(file => {
      formData.append('files', file);
    });

    // Initialize progress tracking
    const initialProgress: FileUploadProgress[] = fileArray.map(file => ({
      name: file.name,
      progress: 0,
      status: 'uploading'
    }));
    
    this.uploadProgress.set(initialProgress);

    return this.http.post<FileUploadResponse>(`${this.baseUrl}/${projectId}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<FileUploadResponse>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress = Math.round(100 * event.loaded / event.total);
              const updatedProgress = this.uploadProgress().map(p => ({
                ...p,
                progress
              }));
              this.uploadProgress.set(updatedProgress);
            }
            break;
          case HttpEventType.Response:
            // Upload complete
            const completedProgress = this.uploadProgress().map(p => ({
              ...p,
              progress: 100,
              status: 'complete' as const
            }));
            this.uploadProgress.set(completedProgress);
            
            // Refresh file list
            this.getProjectFiles(projectId).subscribe();
            break;
        }
        return this.uploadProgress();
      }),
      catchError(error => {
        const errorMessage = this.getErrorMessage(error);
        const errorProgress = this.uploadProgress().map(p => ({
          ...p,
          status: 'error' as const,
          error: errorMessage
        }));
        this.uploadProgress.set(errorProgress);
        this.error.set(errorMessage);
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Delete a file from a project
   */
  deleteFile(projectId: string, fileId: string): Observable<void> {
    return this.http.delete<{success: boolean; message: string}>(`${this.baseUrl}/${projectId}/${fileId}`).pipe(
      map(() => void 0), // Convert to void since we don't need the response data
      tap(() => {
        // Remove file from current list
        const currentFiles = this.files();
        const updatedFiles = currentFiles.filter(file => file.id !== fileId);
        this.files.set(updatedFiles);
      }),
      catchError(error => {
        const errorMessage = this.getErrorMessage(error);
        this.error.set(errorMessage);
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Get file content for viewing
   */
  getFileContent(projectId: string, fileId: string): Observable<string> {
    return this.http.get<FileContentResponse>(`${this.baseUrl}/${projectId}/${fileId}/content`).pipe(
      map(response => response.data.content),
      catchError(error => {
        const errorMessage = this.getErrorMessage(error);
        this.error.set(errorMessage);
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Download a file
   */
  downloadFile(projectId: string, fileId: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${projectId}/${fileId}/download`, {
      responseType: 'blob'
    }).pipe(
      tap(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
      }),
      catchError(error => {
        const errorMessage = this.getErrorMessage(error);
        this.error.set(errorMessage);
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Rename a file (future implementation)
   */
  renameFile(projectId: string, fileId: string, newName: string): Observable<ProjectFile> {
    return this.http.patch<SingleFileResponse>(`${this.baseUrl}/${projectId}/${fileId}`, {
      name: newName
    }).pipe(
      map(response => response.data),
      tap(updatedFile => {
        // Update file in current list
        const currentFiles = this.files();
        const updatedFiles = currentFiles.map(file => 
          file.id === fileId ? updatedFile : file
        );
        this.files.set(updatedFiles);
      }),
      catchError(error => {
        const errorMessage = this.getErrorMessage(error);
        this.error.set(errorMessage);
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Clear upload progress
   */
  clearUploadProgress(): void {
    this.uploadProgress.set([]);
  }

  /**
   * Check if file type is supported for viewing
   */
  isFileViewable(filename: string): boolean {
    const viewableExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.yml', '.yaml'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return viewableExtensions.includes(extension);
  }

  /**
   * Get file type icon class
   */
  getFileIcon(filename: string): string {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    switch (extension) {
      case '.txt':
        return 'description';
      case '.md':
        return 'article';
      case '.json':
        return 'data_object';
      case '.js':
      case '.ts':
        return 'code';
      case '.html':
        return 'web';
      case '.css':
        return 'style';
      case '.yml':
      case '.yaml':
        return 'settings';
      case '.pdf':
        return 'picture_as_pdf';
      default:
        return 'insert_drive_file';
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Extract user-friendly error message from HTTP error response
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    // Prioritize specific status codes for user-friendly messages
    switch (error.status) {
      case 400:
        return 'Invalid file or request. Please check file type and size.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'File or project not found.';
      case 413:
        return 'File size too large. Please choose a smaller file.';
      case 415:
        return 'File type not supported.';
      case 422:
        return 'File validation failed. Please check the file format.';
      case 500:
        return 'Server error occurred. Please try again later.';
      case 0:
        return 'Unable to connect to server. Please check your internet connection.';
      default:
        // Fallback to server message if available, otherwise generic message
        if (error.error?.message) {
          return error.error.message;
        }
        return `An error occurred: ${error.message}`;
    }
  }
}
