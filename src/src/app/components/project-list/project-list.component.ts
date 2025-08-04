import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProjectService, Project } from '../../services/project.service';
import { ProjectModalComponent, ProjectModalData, ProjectModalResult } from '../project-modal/project-modal.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProjectModalComponent],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  searchQuery: string = '';
  sortBy: 'recent' | 'alphabetical' = 'recent';
  isLoading: boolean = false;
  error: string = '';
  
  // Modal state
  showModal: boolean = false;
  modalData: ProjectModalData = { mode: 'create' };

  constructor(
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    
    // Listen for modal results
    window.addEventListener('modalResult', this.handleModalResult.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('modalResult', this.handleModalResult.bind(this));
  }

  /**
   * Load all projects from the API
   */
  loadProjects(): void {
    this.isLoading = true;
    this.error = '';
    
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.applyFiltersAndSort();
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load projects';
        this.isLoading = false;
        console.error('Error loading projects:', error);
      }
    });
  }

  /**
   * Apply search filter and sorting
   */
  applyFiltersAndSort(): void {
    let filtered = [...this.projects];
    
    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.displayName.toLowerCase().includes(query) ||
        project.name.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (this.sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    
    this.filteredProjects = filtered;
  }

  /**
   * Handle search input changes
   */
  onSearchChange(): void {
    this.applyFiltersAndSort();
  }

  /**
   * Handle sort change
   */
  onSortChange(): void {
    this.applyFiltersAndSort();
  }

  /**
   * Open create project modal
   */
  openCreateModal(): void {
    this.modalData = { mode: 'create' };
    this.showModal = true;
  }

  /**
   * Open rename project modal
   */
  openRenameModal(project: Project): void {
    this.modalData = {
      mode: 'rename',
      projectName: project.name,
      projectDisplayName: project.displayName
    };
    this.showModal = true;
  }

  /**
   * Open delete project modal
   */
  openDeleteModal(project: Project): void {
    this.modalData = {
      mode: 'delete',
      projectName: project.name,
      projectDisplayName: project.displayName
    };
    this.showModal = true;
  }

  /**
   * Navigate to project view
   */
  openProject(project: Project): void {
    this.router.navigate(['/project', project.name]);
  }

  /**
   * Handle modal results
   */
  private handleModalResult(event: any): void {
    const result = event.detail as ProjectModalResult;
    
    if (result.action === 'cancel') {
      this.showModal = false;
      return;
    }

    // Get modal component reference to update loading state
    const modalComponent = document.querySelector('app-project-modal') as any;

    switch (result.action) {
      case 'create':
        if (result.name) {
          if (modalComponent) modalComponent.setLoading(true);
          this.createProject(result.name);
        }
        break;
      case 'rename':
        if (result.name && this.modalData.projectName) {
          if (modalComponent) modalComponent.setLoading(true);
          this.renameProject(this.modalData.projectName, result.name);
        }
        break;
      case 'delete':
        if (this.modalData.projectName) {
          if (modalComponent) modalComponent.setLoading(true);
          this.deleteProject(this.modalData.projectName);
        }
        break;
    }
  }

  /**
   * Create a new project
   */
  private createProject(name: string): void {
    this.projectService.createProject(name).subscribe({
      next: () => {
        this.showModal = false;
        this.loadProjects(); // Reload to get updated list
      },
      error: (error) => {
        const modalComponent = document.querySelector('app-project-modal') as any;
        if (modalComponent) {
          modalComponent.setError(error.message || 'Failed to create project');
        }
      }
    });
  }

  /**
   * Rename an existing project
   */
  private renameProject(currentName: string, newName: string): void {
    this.projectService.renameProject(currentName, newName).subscribe({
      next: () => {
        this.showModal = false;
        this.loadProjects(); // Reload to get updated list
      },
      error: (error) => {
        const modalComponent = document.querySelector('app-project-modal') as any;
        if (modalComponent) {
          modalComponent.setError(error.message || 'Failed to rename project');
        }
      }
    });
  }

  /**
   * Delete a project
   */
  private deleteProject(name: string): void {
    this.projectService.deleteProject(name).subscribe({
      next: () => {
        this.showModal = false;
        this.loadProjects(); // Reload to get updated list
      },
      error: (error) => {
        const modalComponent = document.querySelector('app-project-modal') as any;
        if (modalComponent) {
          modalComponent.setError(error.message || 'Failed to delete project');
        }
      }
    });
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
