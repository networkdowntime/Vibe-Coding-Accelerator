import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProjectListComponent } from './project-list.component';
import { ProjectService, Project } from '../../services/project.service';

describe('ProjectListComponent', () => {
  let component: ProjectListComponent;
  let fixture: ComponentFixture<ProjectListComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockProjects: Project[] = [
    {
      name: 'testProject1',
      displayName: 'Test Project 1',
      createdAt: '2025-08-01T12:00:00Z',
      modifiedAt: '2025-08-01T12:00:00Z'
    },
    {
      name: 'testProject2',
      displayName: 'Test Project 2',
      createdAt: '2025-08-02T12:00:00Z',
      modifiedAt: '2025-08-02T12:00:00Z'
    }
  ];

  beforeEach(async () => {
    const projectServiceSpy = jasmine.createSpyObj('ProjectService', [
      'getAllProjects',
      'createProject',
      'renameProject',
      'deleteProject'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ProjectListComponent],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectListComponent);
    component = fixture.componentInstance;
    mockProjectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load projects on init', () => {
      mockProjectService.getAllProjects.and.returnValue(of(mockProjects));

      component.ngOnInit();

      expect(mockProjectService.getAllProjects).toHaveBeenCalled();
      expect(component.projects).toEqual(mockProjects);
      expect(component.filteredProjects).toEqual(mockProjects);
      expect(component.isLoading).toBeFalse();
    });

    it('should handle error when loading projects', () => {
      const errorMessage = 'Failed to load projects';
      mockProjectService.getAllProjects.and.returnValue(throwError(() => new Error(errorMessage)));

      component.ngOnInit();

      expect(component.error).toBe(errorMessage);
      expect(component.isLoading).toBeFalse();
    });
  });

  describe('applyFiltersAndSort', () => {
    beforeEach(() => {
      component.projects = mockProjects;
    });

    it('should filter projects by search query', () => {
      component.searchQuery = 'Project 1';
      component.applyFiltersAndSort();

      expect(component.filteredProjects.length).toBe(1);
      expect(component.filteredProjects[0].displayName).toBe('Test Project 1');
    });

    it('should sort projects by recent (default)', () => {
      component.sortBy = 'recent';
      component.applyFiltersAndSort();

      // Should be sorted by creation date, most recent first
      expect(component.filteredProjects[0].name).toBe('testProject2');
      expect(component.filteredProjects[1].name).toBe('testProject1');
    });

    it('should sort projects alphabetically', () => {
      component.sortBy = 'alphabetical';
      component.applyFiltersAndSort();

      expect(component.filteredProjects[0].displayName).toBe('Test Project 1');
      expect(component.filteredProjects[1].displayName).toBe('Test Project 2');
    });

    it('should apply both search and sort', () => {
      component.searchQuery = 'Project';
      component.sortBy = 'alphabetical';
      component.applyFiltersAndSort();

      expect(component.filteredProjects.length).toBe(2);
      expect(component.filteredProjects[0].displayName).toBe('Test Project 1');
    });
  });

  describe('modal operations', () => {
    it('should open create modal', () => {
      component.openCreateModal();

      expect(component.showModal).toBeTrue();
      expect(component.modalData.mode).toBe('create');
    });

    it('should open rename modal with project data', () => {
      const project = mockProjects[0];
      component.openRenameModal(project);

      expect(component.showModal).toBeTrue();
      expect(component.modalData.mode).toBe('rename');
      expect(component.modalData.projectName).toBe(project.name);
      expect(component.modalData.projectDisplayName).toBe(project.displayName);
    });

    it('should open delete modal with project data', () => {
      const project = mockProjects[0];
      component.openDeleteModal(project);

      expect(component.showModal).toBeTrue();
      expect(component.modalData.mode).toBe('delete');
      expect(component.modalData.projectName).toBe(project.name);
      expect(component.modalData.projectDisplayName).toBe(project.displayName);
    });
  });

  describe('openProject', () => {
    it('should navigate to project view', () => {
      const project = mockProjects[0];
      component.openProject(project);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/project', project.name]);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const dateString = '2025-08-04T15:30:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toContain('8/4/2025');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Should contain time format
    });
  });

  describe('search and sort changes', () => {
    beforeEach(() => {
      component.projects = mockProjects;
      spyOn(component, 'applyFiltersAndSort');
    });

    it('should call applyFiltersAndSort on search change', () => {
      component.onSearchChange();
      expect(component.applyFiltersAndSort).toHaveBeenCalled();
    });

    it('should call applyFiltersAndSort on sort change', () => {
      component.onSortChange();
      expect(component.applyFiltersAndSort).toHaveBeenCalled();
    });
  });
});
