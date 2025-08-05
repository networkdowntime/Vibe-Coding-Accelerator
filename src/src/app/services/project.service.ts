import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Project {
  name: string;
  displayName: string;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface RenameProjectRequest {
  newName: string;
}

export interface ApiError {
  error: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = '/api/projects';

  constructor(private http: HttpClient) {}

  /**
   * Get all projects from the API
   */
  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get a single project by name
   */
  getProject(name: string): Observable<Project | null> {
    return this.getAllProjects().pipe(
      map(projects => projects.find(p => p.name === name) || null)
    );
  }

  /**
   * Create a new project
   */
  createProject(name: string): Observable<Project> {
    const request: CreateProjectRequest = { name };
    return this.http.post<Project>(this.apiUrl, request).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Rename an existing project
   */
  renameProject(currentName: string, newName: string): Observable<Project> {
    const request: RenameProjectRequest = { newName };
    return this.http.put<Project>(`${this.apiUrl}/${currentName}`, request).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a project (soft delete)
   */
  deleteProject(name: string): Observable<{ name: string; message: string }> {
    return this.http.delete<{ name: string; message: string }>(`${this.apiUrl}/${name}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else {
        errorMessage = `Server Error: ${error.status} ${error.statusText}`;
      }
    }
    
    console.error('ProjectService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
