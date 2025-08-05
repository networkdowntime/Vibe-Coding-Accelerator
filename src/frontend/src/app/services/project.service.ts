import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'draft';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  metadata?: Record<string, any>;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: 'active' | 'draft';
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'completed' | 'draft';
}

export interface ProjectListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Project[];
  meta: {
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      startIndex: number;
      endIndex: number;
    };
    filters: {
      sortBy: string;
      sortOrder: string;
    };
  };
  timestamp: string;
}

export interface SingleProjectResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Project;
  meta: {};
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly baseUrl = 'http://localhost:3001/api/v1/projects';
  
  // Reactive signals for state management
  private readonly _projects = signal<Project[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  
  // Public readonly signals
  public readonly projects = this._projects.asReadonly();
  public readonly loading = this._loading.asReadonly();
  public readonly error = this._error.asReadonly();

  constructor(private http: HttpClient) {}

  /**
   * Load all projects from the backend
   */
  loadProjects(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<ProjectListResponse> {
    this._loading.set(true);
    this._error.set(null);

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<ProjectListResponse>(this.baseUrl, { params: httpParams }).pipe(
      tap(response => {
        // Filter out deleted projects from the data array
        const activeProjects = response.data.filter((p: Project) => !p.deletedAt);
        this._projects.set(activeProjects);
        this._loading.set(false);
      }),
      catchError(error => {
        this._error.set(this.getErrorMessage(error));
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a specific project by ID
   */
  getProject(id: string): Observable<Project> {
    return this.http.get<SingleProjectResponse>(`${this.baseUrl}/${id}`).pipe(
      map(response => response.data),
      catchError(error => {
        this._error.set(this.getErrorMessage(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new project
   */
  createProject(projectData: CreateProjectRequest): Observable<Project> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.post<SingleProjectResponse>(this.baseUrl, projectData).pipe(
      map(response => response.data),
      tap(newProject => {
        // Add the new project to the current list
        const currentProjects = this._projects();
        this._projects.set([newProject, ...currentProjects]);
        this._loading.set(false);
      }),
      catchError(error => {
        this._error.set(this.getErrorMessage(error));
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing project
   */
  updateProject(id: string, updates: UpdateProjectRequest): Observable<Project> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.put<SingleProjectResponse>(`${this.baseUrl}/${id}`, updates).pipe(
      map(response => response.data),
      tap(updatedProject => {
        // Update the project in the current list
        const currentProjects = this._projects();
        const updatedProjects = currentProjects.map(p => 
          p.id === id ? updatedProject : p
        );
        this._projects.set(updatedProjects);
        this._loading.set(false);
      }),
      catchError(error => {
        this._error.set(this.getErrorMessage(error));
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a project (soft delete)
   */
  deleteProject(id: string): Observable<void> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.delete<{success: boolean, message: string}>(`${this.baseUrl}/${id}`).pipe(
      map(() => void 0), // Convert to void since we don't need the response data
      tap(() => {
        // Remove the project from the current list
        const currentProjects = this._projects();
        const filteredProjects = currentProjects.filter(p => p.id !== id);
        this._projects.set(filteredProjects);
        this._loading.set(false);
      }),
      catchError(error => {
        this._error.set(this.getErrorMessage(error));
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh the projects list
   */
  refreshProjects(): Observable<ProjectListResponse> {
    return this.loadProjects();
  }

  /**
   * Search projects locally (after they're loaded)
   */
  searchProjects(query: string): Project[] {
    const allProjects = this._projects();
    if (!query.trim()) {
      return allProjects;
    }

    const searchTerm = query.toLowerCase();
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      project.description?.toLowerCase().includes(searchTerm) ||
      project.status.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Sort projects locally
   */
  sortProjects(projects: Project[], sortBy: keyof Project, sortOrder: 'asc' | 'desc' = 'asc'): Project[] {
    return [...projects].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    // First check for custom error messages in the error object
    if (error.error?.message) {
      return error.error.message;
    }
    
    // Check for status codes and return user-friendly messages
    if (error.status === 0) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (error.status === 400) {
      return 'Invalid request. Please check your input.';
    }
    if (error.status === 404) {
      return 'Project not found.';
    }
    if (error.status === 500) {
      return 'Server error. Please try again later.';
    }
    
    // If we have a string error message, use it
    if (typeof error.error === 'string') {
      return error.error;
    }
    
    // Fallback for any other errors
    return 'An unexpected error occurred. Please try again.';
  }
}
