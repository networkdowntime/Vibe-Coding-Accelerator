import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// File type interfaces
export interface FileItem {
  name: string;
  size: number;
  type: string;
  createdAt: string;
  modifiedAt: string;
}

export interface FileUploadResponse {
  name: string;
  size: number;
  type: string;
  message: string;
}

export interface FileRenameResponse {
  oldName: string;
  newName: string;
  message: string;
}

export interface FileDeleteResponse {
  name: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly baseUrl = 'http://localhost:3001/api/projects';

  constructor(private http: HttpClient) {}

  /**
   * List all files in a project
   */
  listFiles(projectName: string): Observable<FileItem[]> {
    return this.http.get<FileItem[]>(`${this.baseUrl}/${projectName}/files`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Upload a file to a project
   */
  uploadFile(projectName: string, file: File): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileUploadResponse>(`${this.baseUrl}/${projectName}/files`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get file content (for viewing)
   */
  getFileContent(projectName: string, fileName: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${projectName}/files/${fileName}`, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Get file URL for opening in browser
   */
  getFileUrl(projectName: string, fileName: string): string {
    return `${this.baseUrl}/${projectName}/files/${fileName}`;
  }

  /**
   * Rename a file
   */
  renameFile(projectName: string, oldName: string, newName: string): Observable<FileRenameResponse> {
    return this.http.put<FileRenameResponse>(`${this.baseUrl}/${projectName}/files/${oldName}`, {
      newName: newName
    }).pipe(catchError(this.handleError));
  }

  /**
   * Delete a file
   */
  deleteFile(projectName: string, fileName: string): Observable<FileDeleteResponse> {
    return this.http.delete<FileDeleteResponse>(`${this.baseUrl}/${projectName}/files/${fileName}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Check if file type is supported
   */
  isSupportedFileType(fileName: string): boolean {
    const supportedExtensions = ['.txt', '.md', '.yml', '.yaml', '.html', '.pdf'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return supportedExtensions.includes(extension);
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon class based on file extension
   */
  getFileIconClass(fileName: string): string {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    const iconMap: { [key: string]: string } = {
      '.txt': 'file-text',
      '.md': 'file-markdown',
      '.yml': 'file-yaml',
      '.yaml': 'file-yaml',
      '.html': 'file-html',
      '.pdf': 'file-pdf'
    };
    
    return iconMap[extension] || 'file-generic';
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else {
        errorMessage = `Server returned code ${error.status}: ${error.message}`;
      }
    }
    
    console.error('FileService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
