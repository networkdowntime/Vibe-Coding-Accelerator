import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FileListComponent } from '../file-list/file-list.component';
import { AgentSelectComponent } from '../agent-select/agent-select.component';
import { ProjectModalComponent, ProjectModalData, ProjectModalResult } from '../project-modal/project-modal.component';
import { Agent } from '../../services/agent.service';
import { ProjectService, Project } from '../../services/project.service';
import { LlmService, ProcessingState } from '../../services/llm.service';

@Component({
  selector: 'app-project-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FileListComponent, AgentSelectComponent, ProjectModalComponent],
  templateUrl: './project-view.component.html',
  styleUrl: './project-view.component.scss'
})
export class ProjectViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  projectId: string | null = null;
  project: Project | null = null;
  errorMessage: string = '';
  selectedAgent: Agent | null = null;
  selectedTechStack: string[] = [];
  
  // LLM Processing state
  processingState: ProcessingState = {
    isProcessing: false,
    currentJob: null,
    error: null
  };
  
  // Modal state
  showModal: boolean = false;
  modalData: ProjectModalData = { mode: 'create' };
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private llmService: LlmService
  ) {}
  
  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.loadProject();
    }
    
    // Subscribe to LLM processing state
    this.llmService.processingState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.processingState = state;
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load project data
   */
  private loadProject(): void {
    if (!this.projectId) return;
    
    this.projectService.getProject(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
        if (!project) {
          this.errorMessage = `Project '${this.projectId}' not found`;
        }
      },
      error: (error) => {
        console.error('Error loading project:', error);
        this.errorMessage = 'Failed to load project data';
      }
    });
  }
  
  /**
   * Check if config generation can be started
   */
  get canGenerateConfig(): boolean {
    return this.selectedAgent !== null && 
           this.selectedTechStack.length > 0 && 
           !this.processingState.isProcessing;
  }
  
  /**
   * Get safe progress info for template
   */
  get safeProgressInfo() {
    const job = this.processingState.currentJob;
    if (!job || !job.progress) {
      return { completed: 0, failed: 0, total: 0, current: null };
    }
    return {
      completed: job.progress.completed || 0,
      failed: job.progress.failed || 0,
      total: job.progress.total || 0,
      current: job.progress.current || null
    };
  }
  
  /**
   * Get safe error info for template
   */
  get safeErrorInfo() {
    const job = this.processingState.currentJob;
    return {
      hasErrors: !!(job?.errors && job.errors.length > 0),
      errors: job?.errors || [],
      count: job?.errors?.length || 0
    };
  }
  
  /**
   * Generate AI agent configuration
   */
  generateConfig(): void {
    if (!this.canGenerateConfig || !this.projectId) {
      return;
    }
    
    this.llmService.startProcessing(this.projectId).subscribe({
      next: (response) => {
        console.log('Config generation started:', response.message);
      },
      error: (error) => {
        console.error('Error starting config generation:', error);
        this.errorMessage = error.message || 'Failed to start config generation';
        // Clear error after 5 seconds
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }
  
  /**
   * Cancel config generation
   */
  cancelConfigGeneration(): void {
    if (this.processingState.currentJob) {
      this.llmService.cancelProcessing(this.processingState.currentJob.jobId).subscribe({
        next: (response) => {
          console.log('Config generation cancelled:', response.message);
        },
        error: (error) => {
          console.error('Error cancelling config generation:', error);
          this.errorMessage = error.message || 'Failed to cancel config generation';
          // Clear error after 5 seconds
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
    }
  }
  
  /**
   * Retry failed config generation
   */
  retryConfigGeneration(): void {
    if (this.processingState.currentJob) {
      this.llmService.retryProcessing(this.processingState.currentJob.jobId).subscribe({
        next: (response) => {
          console.log('Config generation restarted:', response.message);
        },
        error: (error) => {
          console.error('Error retrying config generation:', error);
          this.errorMessage = error.message || 'Failed to retry config generation';
          // Clear error after 5 seconds
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
    }
  }
  
  /**
   * Download generated results
   */
  downloadResults(): void {
    if (this.processingState.currentJob && this.processingState.currentJob.status === 'completed') {
      this.llmService.downloadConfig(this.processingState.currentJob.jobId).subscribe({
        next: (blob) => {
          // Create and download the zip file
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ai-agent-config-${this.processingState.currentJob!.jobId}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          console.log('AI agent config zip file downloaded');
        },
        error: (error) => {
          console.error('Error downloading config:', error);
          this.errorMessage = error.message || 'Failed to download AI agent config';
          // Clear error after 5 seconds
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
    }
  }
  
  /**
   * Handle file upload success
   */
  onFileUploaded(): void {
    // File was uploaded successfully - could show notification here
    console.log('File uploaded successfully');
  }
  
  /**
   * Handle file updates (rename/delete)
   */
  onFileUpdated(): void {
    // File was updated successfully - could show notification here
    console.log('File updated successfully');
  }
  
  /**
   * Handle file management errors
   */
  onFileError(error: string): void {
    this.errorMessage = error;
    // Clear error after 5 seconds
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
  
  /**
   * Handle agent selection change
   */
  onAgentChanged(agent: Agent | null): void {
    this.selectedAgent = agent;
    console.log('Selected agent:', agent);
  }
  
  /**
   * Handle tech stack selection change
   */
  onTechStackChanged(techStack: string[]): void {
    this.selectedTechStack = techStack;
    console.log('Selected tech stack:', techStack);
  }
  
  /**
   * Handle agent selection errors
   */
  onAgentError(error: string): void {
    this.errorMessage = error;
    // Clear error after 5 seconds
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
  
  /**
   * Edit project name
   */
  editProjectName(): void {
    if (!this.projectId || !this.project) return;
    
    this.modalData = {
      mode: 'rename',
      projectName: this.project.name,
      projectDisplayName: this.project.displayName
    };
    this.showModal = true;
  }
  
  /**
   * Delete project
   */
  deleteProject(): void {
    if (!this.projectId || !this.project) return;
    
    this.modalData = {
      mode: 'delete',
      projectName: this.project.name,
      projectDisplayName: this.project.displayName
    };
    this.showModal = true;
  }
  
  /**
   * Handle modal results
   */
  onModalResult(result: ProjectModalResult): void {
    if (result.action === 'cancel') {
      this.showModal = false;
      return;
    }
    
    if (result.success) {
      this.showModal = false;
      
      if (result.action === 'delete') {
        // Navigate back to project list after successful deletion
        this.router.navigate(['/']);
      } else if (result.action === 'rename') {
        // Navigate to the new project URL with the updated project name
        if (result.newProjectName) {
          // Use window.location.href for a full page reload to the new URL
          window.location.href = `/project/${result.newProjectName}`;
        } else {
          // Fallback: reload the page if we don't have the new name
          window.location.reload();
        }
      }
    }
    // If not successful, modal will show the error and stay open
  }
}
