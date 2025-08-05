import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  status: 'active' | 'beta' | 'deprecated';
  metadata?: Record<string, any>;
}

export interface TechStackOption {
  id: string;
  name: string;
  description: string;
  applyTo: string;
  category: string;
  tags: string[];
  filePath: string;
}

export interface TechStackSelection {
  projectId: string;
  selectedAgents: string[];
  selectedTechStack: string[];
  preferences: {
    primaryLanguage?: string;
    framework?: string;
    architectureStyle?: string;
  };
  lastUpdated: string;
}

export interface AgentsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Agent[];
  meta: {};
  timestamp: string;
}

export interface TechStackResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: TechStackOption[];
  meta: {};
  timestamp: string;
}

export interface SelectionResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: TechStackSelection;
  meta: {};
  timestamp: string;
}

export interface SaveSelectionRequest {
  selectedAgents: string[];
  selectedTechStack: string[];
  preferences?: {
    primaryLanguage?: string;
    framework?: string;
    architectureStyle?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private readonly baseUrl = 'http://localhost:3001/api/v1/agents';
  
  // Reactive signals for state management
  private readonly _agents = signal<Agent[]>([]);
  private readonly _techStackOptions = signal<TechStackOption[]>([]);
  private readonly _currentSelection = signal<TechStackSelection | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  
  // Public readonly signals
  public readonly agents = this._agents.asReadonly();
  public readonly techStackOptions = this._techStackOptions.asReadonly();
  public readonly currentSelection = this._currentSelection.asReadonly();
  public readonly loading = this._loading.asReadonly();
  public readonly error = this._error.asReadonly();

  constructor(private http: HttpClient) {}

  /**
   * Load all available AI agents
   */
  loadAgents(): Observable<Agent[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<AgentsResponse>(this.baseUrl).pipe(
      map(response => response.data),
      tap(agents => {
        this._agents.set(agents);
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
   * Load available tech stack options
   */
  loadTechStackOptions(): Observable<TechStackOption[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<TechStackResponse>(`${this.baseUrl}/techstack`).pipe(
      map(response => response.data),
      tap(options => {
        this._techStackOptions.set(options);
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
   * Get saved selection for a project
   */
  loadProjectSelection(projectId: string): Observable<TechStackSelection> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<SelectionResponse>(`${this.baseUrl}/projects/${projectId}/selection`).pipe(
      map(response => response.data),
      tap(selection => {
        this._currentSelection.set(selection);
        this._loading.set(false);
      }),
      catchError(error => {
        // If no selection exists (404), that's not an error - just set empty selection
        if (error.status === 404) {
          this._currentSelection.set(null);
          this._loading.set(false);
          return throwError(() => error);
        }
        
        this._error.set(this.getErrorMessage(error));
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Save agent and tech stack selection for a project
   */
  saveProjectSelection(projectId: string, selection: SaveSelectionRequest): Observable<TechStackSelection> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.post<SelectionResponse>(`${this.baseUrl}/projects/${projectId}/selection`, selection).pipe(
      map(response => response.data),
      tap(savedSelection => {
        this._currentSelection.set(savedSelection);
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
   * Get agents by category
   */
  getAgentsByCategory(category: string): Agent[] {
    const agents = this._agents();
    if (!agents || agents.length === 0) {
      return [];
    }
    return agents.filter(agent => agent.category === category);
  }

  /**
   * Get tech stack options by category
   */
  getTechStackByCategory(category: string): TechStackOption[] {
    const techStackOptions = this._techStackOptions();
    if (!techStackOptions || techStackOptions.length === 0) {
      return [];
    }
    return techStackOptions.filter(option => option.category === category);
  }

  /**
   * Search tech stack options
   */
  searchTechStack(query: string): TechStackOption[] {
    const techStackOptions = this._techStackOptions();
    if (!techStackOptions || techStackOptions.length === 0) {
      return [];
    }

    if (!query.trim()) {
      return techStackOptions;
    }

    const searchTerm = query.toLowerCase();
    return techStackOptions.filter(option =>
      option.name.toLowerCase().includes(searchTerm) ||
      option.description.toLowerCase().includes(searchTerm) ||
      option.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

    /**
   * Get unique agent categories
   */
  getAgentCategories(): string[] {
    const agents = this._agents();
    if (!agents || agents.length === 0) {
      return [];
    }
    const categories = agents.map(agent => agent.category);
    return [...new Set(categories)];
  }

  /**
   * Get unique categories from tech stack options
   */
  getTechStackCategories(): string[] {
    const techStackOptions = this._techStackOptions();
    if (!techStackOptions || techStackOptions.length === 0) {
      return [];
    }
    const categories = techStackOptions.map(option => option.category);
    return [...new Set(categories)].sort();
  }

  /**
   * Check if an agent is selected in current selection
   */
  isAgentSelected(agentId: string): boolean {
    const currentSelection = this._currentSelection();
    return currentSelection?.selectedAgents.includes(agentId) ?? false;
  }

  /**
   * Check if a tech stack option is selected in current selection
   */
  isTechStackSelected(techStackId: string): boolean {
    const currentSelection = this._currentSelection();
    return currentSelection?.selectedTechStack.includes(techStackId) ?? false;
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    this._currentSelection.set(null);
  }

  /**
   * Refresh all data
   */
  refreshAll(): Observable<[Agent[], TechStackOption[]]> {
    return new Observable(observer => {
      Promise.all([
        this.loadAgents().toPromise(),
        this.loadTechStackOptions().toPromise()
      ]).then(([agents, techStack]) => {
        observer.next([agents!, techStack!]);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    // First check for custom error messages in the error object
    if (error.error?.message) {
      return error.error.message;
    }
    
    // Check for status codes and return user-friendly messages
    if (error.status === 0) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (error.status === 400) {
      return 'Invalid request. Please check your selection.';
    }
    if (error.status === 404) {
      return 'Resource not found.';
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
