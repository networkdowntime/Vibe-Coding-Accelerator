import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FileListComponent } from '../file-list/file-list.component';
import { AgentSelectComponent } from '../agent-select/agent-select.component';
import { Agent } from '../../services/agent.service';

@Component({
  selector: 'app-project-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FileListComponent, AgentSelectComponent],
  templateUrl: './project-view.component.html',
  styleUrl: './project-view.component.scss'
})
export class ProjectViewComponent implements OnInit {
  projectId: string | null = null;
  errorMessage: string = '';
  selectedAgent: Agent | null = null;
  selectedTechStack: string[] = [];
  
  constructor(private route: ActivatedRoute) {}
  
  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
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
    // TODO: Implement project name editing functionality
    console.log('Edit project name clicked');
  }

  /**
   * Delete project
   */
  deleteProject(): void {
    // TODO: Implement project deletion functionality with confirmation
    console.log('Delete project clicked');
  }
}
