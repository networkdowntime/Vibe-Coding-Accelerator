import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, Subject } from 'rxjs';

import { MainUiComponent } from './main-ui.component';
import { ProjectService, Project } from '../../services/project.service';
import { NotificationService } from '../../services/notification.service';
import { ProjectModalComponent, ProjectModalResult } from '../project-modal/project-modal.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

describe('MainUiComponent', () => {
  let component: MainUiComponent;
  let fixture: ComponentFixture<MainUiComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockProject: Project = {
    id: '1',
    name: 'Test Project',
    description: 'Test Description',
    status: 'active',
    createdAt: '2025-08-04T10:00:00Z',
    updatedAt: '2025-08-04T10:00:00Z'
  };

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      url: '/projects' // Set initial value as property
    });
    
    const projectServiceSpy = jasmine.createSpyObj('ProjectService', [
      'loadProjects', 'createProject', 'updateProject', 'deleteProject', 'clearError',
      'refreshProjects', 'searchProjects', 'sortProjects'
    ], {
      projects: jasmine.createSpy().and.returnValue([mockProject]),
      loading: jasmine.createSpy().and.returnValue(false),
      error: jasmine.createSpy().and.returnValue(null)
    });
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'showSuccess', 'showError', 'showInfo', 'showWarning'
    ]);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        MainUiComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { url: [{ path: 'projects' }] } } },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainUiComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockProjectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    mockNotificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    // Set up default return values
    mockProjectService.loadProjects.and.returnValue(of({
      projects: [mockProject],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    }));
    mockProjectService.createProject.and.returnValue(of(mockProject));
    mockProjectService.updateProject.and.returnValue(of(mockProject));
    mockProjectService.deleteProject.and.returnValue(of(void 0));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should set isProjectsView to true when on projects route', () => {
      // Component is already initialized with /projects route
      component.ngOnInit();
      expect(component.isProjectsView).toBe(true);
      expect(mockProjectService.loadProjects).toHaveBeenCalled();
    });

    it('should set isProjectsView to false when not on projects route', async () => {
      // Reconfigure TestBed with different router URL
      await TestBed.resetTestingModule();
      const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
        url: '/' // Different URL
      });
      const projectServiceSpy = jasmine.createSpyObj('ProjectService', [
        'loadProjects', 'createProject', 'updateProject', 'deleteProject', 'clearError',
        'refreshProjects', 'searchProjects', 'sortProjects'
      ], {
        projects: jasmine.createSpy().and.returnValue([mockProject]),
        loading: jasmine.createSpy().and.returnValue(false),
        error: jasmine.createSpy().and.returnValue(null)
      });
      const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
        'showSuccess', 'showError', 'showInfo', 'showWarning'
      ]);
      const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

      await TestBed.configureTestingModule({
        imports: [
          MainUiComponent,
          NoopAnimationsModule
        ],
        providers: [
          { provide: Router, useValue: routerSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { url: [{ path: 'home' }] } } },
          { provide: ProjectService, useValue: projectServiceSpy },
          { provide: NotificationService, useValue: notificationServiceSpy },
          { provide: MatDialog, useValue: dialogSpy }
        ]
      }).compileComponents();

      const testFixture = TestBed.createComponent(MainUiComponent);
      const testComponent = testFixture.componentInstance;
      
      testComponent.ngOnInit();
      expect(testComponent.isProjectsView).toBe(false);
      expect(projectServiceSpy.loadProjects).not.toHaveBeenCalled();
    });

    it('should load projects when on projects view', () => {
      // Component is already initialized with /projects route
      component.ngOnInit();
      expect(mockProjectService.loadProjects).toHaveBeenCalled();
    });
  });

  describe('loadProjects', () => {
    it('should load projects successfully', () => {
      component.loadProjects();
      expect(mockProjectService.loadProjects).toHaveBeenCalled();
    });

    it('should handle load projects error', () => {
      mockProjectService.loadProjects.and.returnValue(throwError(() => new Error('Load failed')));
      
      component.loadProjects();
      
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Failed to load projects. Please try again.'
      );
    });
  });

  describe('search and filter functionality', () => {
    beforeEach(() => {
      // Mock the signals to return test data
      (mockProjectService as any).projects = jasmine.createSpy().and.returnValue([
        mockProject,
        {
          id: '2',
          name: 'Another Project',
          description: 'Different description',
          status: 'draft',
          createdAt: '2025-08-03T10:00:00Z',
          updatedAt: '2025-08-03T10:00:00Z'
        }
      ]);
    });

    it('should update search query', () => {
      component.searchQuery = 'test';
      component.onSearchChange();
      // The computed property will be triggered automatically
      expect(component.searchQuery).toBe('test');
    });

    it('should update status filter', () => {
      component.statusFilter = 'active';
      component.onFilterChange();
      expect(component.statusFilter).toBe('active');
    });

    it('should update sort criteria', () => {
      component.sortBy = 'name';
      component.onSortChange();
      expect(component.sortBy).toBe('name');
    });

    it('should toggle sort order', () => {
      component.sortOrder = 'asc';
      component.toggleSortOrder();
      expect(component.sortOrder).toBe('desc');

      component.toggleSortOrder();
      expect(component.sortOrder).toBe('asc');
    });

    it('should clear all filters', () => {
      component.searchQuery = 'test';
      component.statusFilter = 'active';
      component.sortBy = 'name';
      component.sortOrder = 'asc';

      component.clearFilters();

      expect(component.searchQuery).toBe('');
      expect(component.statusFilter).toBe('');
      expect(component.sortBy).toBe('updatedAt');
      expect(component.sortOrder).toBe('desc');
    });
  });

  describe('navigation methods', () => {
    it('should navigate to projects view', () => {
      component.viewProjects();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
    });

    it('should navigate to project view', () => {
      component.viewProject('123');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/project', '123']);
    });
  });

  describe('createNewProject', () => {
    it('should open create project modal and handle success', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      const mockResult: ProjectModalResult = {
        action: 'save',
        data: {
          name: 'New Project',
          description: 'New Description',
          status: 'active'
        }
      };

      dialogRefSpy.afterClosed.and.returnValue(of(mockResult));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.createNewProject();

      expect(mockDialog.open).toHaveBeenCalledWith(ProjectModalComponent, {
        width: '500px',
        disableClose: true,
        data: {
          mode: 'create',
          title: 'Create New Project'
        }
      });

      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'New Description',
        status: 'active'
      });

      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith(
        `Project "${mockProject.name}" created successfully!`
      );
    });

    it('should handle create project error', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      const mockResult: ProjectModalResult = {
        action: 'save',
        data: { name: 'New Project' }
      };

      dialogRefSpy.afterClosed.and.returnValue(of(mockResult));
      mockDialog.open.and.returnValue(dialogRefSpy);
      mockProjectService.createProject.and.returnValue(throwError(() => new Error('Create failed')));

      component.createNewProject();

      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Failed to create project. Please try again.'
      );
    });

    it('should handle dialog cancellation', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of({ action: 'cancel' }));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.createNewProject();

      expect(mockProjectService.createProject).not.toHaveBeenCalled();
    });
  });

  describe('editProject', () => {
    it('should open edit project modal and handle success', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      const mockResult: ProjectModalResult = {
        action: 'save',
        data: {
          name: 'Updated Project',
          description: 'Updated Description',
          status: 'completed'
        }
      };

      dialogRefSpy.afterClosed.and.returnValue(of(mockResult));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.editProject(mockProject);

      expect(mockDialog.open).toHaveBeenCalledWith(ProjectModalComponent, {
        width: '500px',
        disableClose: true,
        data: {
          mode: 'edit',
          project: mockProject,
          title: `Edit Project: ${mockProject.name}`
        }
      });

      expect(mockProjectService.updateProject).toHaveBeenCalledWith(mockProject.id, {
        name: 'Updated Project',
        description: 'Updated Description',
        status: 'completed'
      });
    });

    it('should handle edit project error', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      const mockResult: ProjectModalResult = {
        action: 'save',
        data: { name: 'Updated Project' }
      };

      dialogRefSpy.afterClosed.and.returnValue(of(mockResult));
      mockDialog.open.and.returnValue(dialogRefSpy);
      mockProjectService.updateProject.and.returnValue(throwError(() => new Error('Update failed')));

      component.editProject(mockProject);

      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Failed to update project. Please try again.'
      );
    });
  });

  describe('renameProject', () => {
    it('should open rename project modal and handle success', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      const mockResult: ProjectModalResult = {
        action: 'save',
        data: { name: 'Renamed Project' }
      };

      dialogRefSpy.afterClosed.and.returnValue(of(mockResult));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.renameProject(mockProject);

      expect(mockDialog.open).toHaveBeenCalledWith(ProjectModalComponent, {
        width: '400px',
        disableClose: true,
        data: {
          mode: 'rename',
          project: mockProject,
          title: `Rename Project: ${mockProject.name}`
        }
      });

      expect(mockProjectService.updateProject).toHaveBeenCalledWith(mockProject.id, {
        name: 'Renamed Project'
      });
    });
  });

  describe('deleteProject', () => {
    it('should open confirmation dialog and handle delete', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.deleteProject(mockProject);

      expect(mockDialog.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
        width: '400px',
        data: {
          title: 'Delete Project',
          message: `Are you sure you want to delete "${mockProject.name}"? This action cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'danger',
          icon: 'delete_forever'
        }
      });

      expect(mockProjectService.deleteProject).toHaveBeenCalledWith(mockProject.id);
      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith(
        `Project "${mockProject.name}" deleted successfully.`
      );
    });

    it('should handle delete confirmation cancellation', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(false));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.deleteProject(mockProject);

      expect(mockProjectService.deleteProject).not.toHaveBeenCalled();
    });

    it('should handle delete project error', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(dialogRefSpy);
      mockProjectService.deleteProject.and.returnValue(throwError(() => new Error('Delete failed')));

      component.deleteProject(mockProject);

      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Failed to delete project. Please try again.'
      );
    });
  });

  describe('duplicateProject', () => {
    it('should show info message for duplicate feature', () => {
      component.duplicateProject(mockProject);
      expect(mockNotificationService.showInfo).toHaveBeenCalledWith(
        'Project duplication feature coming soon!'
      );
    });
  });

  describe('getProjectIcon', () => {
    it('should return correct icons for project status', () => {
      expect(component.getProjectIcon('active')).toBe('play_circle');
      expect(component.getProjectIcon('completed')).toBe('check_circle');
      expect(component.getProjectIcon('draft')).toBe('edit');
      expect(component.getProjectIcon('unknown')).toBe('folder');
    });
  });

  describe('component lifecycle', () => {
    it('should complete destroy subject on ngOnDestroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
