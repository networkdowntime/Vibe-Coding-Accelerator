import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Agent {
  id: string;
  name: string;
}

export interface TechStack {
  id: string;
  name: string;
  displayName: string;
}

export interface AgentsResponse {
  agents: Agent[];
}

export interface TechStacksResponse {
  techStacks: TechStack[];
}

export interface TechStackSaveResponse {
  message: string;
  techStack: string[];
  aiAgent?: string;
}

export interface ProjectTechStackResponse {
  techStack: string[];
  aiAgent: string | null;
}

export interface AiAgentSaveResponse {
  message: string;
  aiAgent: string;
}

export interface AiAgentResponse {
  aiAgent: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private readonly baseUrl = '/api';
  private selectedAgentSubject = new BehaviorSubject<Agent | null>(null);
  private selectedTechStackSubject = new BehaviorSubject<string[]>([]);

  public selectedAgent$ = this.selectedAgentSubject.asObservable();
  public selectedTechStack$ = this.selectedTechStackSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get all available AI agents
   */
  getAgents(): Observable<Agent[]> {
    return this.http.get<AgentsResponse>(`${this.baseUrl}/agents`)
      .pipe(
        map(response => response.agents),
        catchError(this.handleError<Agent[]>('getAgents', []))
      );
  }

  /**
   * Get tech stack options for a specific agent
   */
  getTechStacks(agentId: string): Observable<TechStack[]> {
    return this.http.get<TechStacksResponse>(`${this.baseUrl}/agents/${agentId}/tech-stacks`)
      .pipe(
        map(response => response.techStacks),
        catchError(this.handleError<TechStack[]>('getTechStacks', []))
      );
  }

  /**
   * Save tech stack selection for a project
   */
  saveTechStack(projectName: string, techStack: string[], aiAgent?: string): Observable<TechStackSaveResponse> {
    const body: any = { techStack };
    if (aiAgent) {
      body.aiAgent = aiAgent;
    }
    
    return this.http.post<TechStackSaveResponse>(`${this.baseUrl}/projects/${projectName}/tech-stack`, body)
      .pipe(
        catchError(this.handleError<TechStackSaveResponse>('saveTechStack'))
      );
  }

  /**
   * Get tech stack and AI agent for a project
   */
  getProjectTechStack(projectName: string): Observable<{ techStack: string[]; aiAgent: string | null }> {
    return this.http.get<ProjectTechStackResponse>(`${this.baseUrl}/projects/${projectName}/tech-stack`)
      .pipe(
        map(response => ({ techStack: response.techStack, aiAgent: response.aiAgent })),
        catchError(this.handleError<{ techStack: string[]; aiAgent: string | null }>('getProjectTechStack', { techStack: [], aiAgent: null }))
      );
  }

  /**
   * Save AI agent selection for a project
   */
  saveAiAgent(projectName: string, aiAgent: string): Observable<AiAgentSaveResponse> {
    return this.http.post<AiAgentSaveResponse>(`${this.baseUrl}/projects/${projectName}/ai-agent`, { aiAgent })
      .pipe(
        catchError(this.handleError<AiAgentSaveResponse>('saveAiAgent'))
      );
  }

  /**
   * Get AI agent for a project
   */
  getProjectAiAgent(projectName: string): Observable<string | null> {
    return this.http.get<AiAgentResponse>(`${this.baseUrl}/projects/${projectName}/ai-agent`)
      .pipe(
        map(response => response.aiAgent),
        catchError(this.handleError<string | null>('getProjectAiAgent', null))
      );
  }

  /**
   * Set the selected agent (used by components)
   */
  setSelectedAgent(agent: Agent | null): void {
    this.selectedAgentSubject.next(agent);
  }

  /**
   * Get the currently selected agent
   */
  getSelectedAgent(): Agent | null {
    return this.selectedAgentSubject.value;
  }

  /**
   * Set the selected tech stack (used by components)
   */
  setSelectedTechStack(techStack: string[]): void {
    this.selectedTechStackSubject.next(techStack);
  }

  /**
   * Get the currently selected tech stack
   */
  getSelectedTechStack(): string[] {
    return this.selectedTechStackSubject.value;
  }

  /**
   * Add a tech stack item
   */
  addTechStackItem(item: string): void {
    const currentStack = this.getSelectedTechStack();
    if (!currentStack.includes(item)) {
      this.setSelectedTechStack([...currentStack, item]);
    }
  }

  /**
   * Remove a tech stack item
   */
  removeTechStackItem(item: string): void {
    const currentStack = this.getSelectedTechStack();
    const updatedStack = currentStack.filter(stackItem => stackItem !== item);
    this.setSelectedTechStack(updatedStack);
  }

  /**
   * Error handler for HTTP operations
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return new Observable<T>(observer => {
        if (result !== undefined) {
          observer.next(result);
        } else {
          observer.error(error);
        }
        observer.complete();
      });
    };
  }
}
