import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectService, Project, CreateProjectRequest, UpdateProjectRequest, ProjectListResponse } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  const mockProject: Project = {
    id: '1',
    name: 'Test Project',
    description: 'Test Description',
    status: 'active',
    createdAt: '2025-08-04T10:00:00Z',
    updatedAt: '2025-08-04T10:00:00Z'
  };

  const mockProjectListResponse: ProjectListResponse = {
    projects: [mockProject],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectService]
    });
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadProjects', () => {
    it('should load projects successfully', () => {
      service.loadProjects().subscribe(response => {
        expect(response).toEqual(mockProjectListResponse);
        expect(service.projects()).toEqual([mockProject]);
        expect(service.loading()).toBeFalsy();
        expect(service.error()).toBeNull();
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      expect(req.request.method).toBe('GET');
      req.flush(mockProjectListResponse);
    });

    it('should filter out deleted projects', () => {
      const responseWithDeleted: ProjectListResponse = {
        projects: [
          mockProject,
          { ...mockProject, id: '2', deletedAt: '2025-08-04T10:00:00Z' }
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      service.loadProjects().subscribe(response => {
        expect(service.projects()).toEqual([mockProject]);
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      req.flush(responseWithDeleted);
    });

    it('should handle load projects error', () => {
      service.loadProjects().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.loading()).toBeFalsy();
          expect(service.error()).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      req.flush('Error loading projects', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should include query parameters', () => {
      const params = {
        page: 2,
        limit: 5,
        search: 'test',
        status: 'active',
        sortBy: 'name',
        sortOrder: 'asc' as const
      };

      service.loadProjects(params).subscribe();

      const req = httpMock.expectOne(request => 
        request.url === 'http://localhost:3001/api/v1/projects' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '5' &&
        request.params.get('search') === 'test' &&
        request.params.get('status') === 'active' &&
        request.params.get('sortBy') === 'name' &&
        request.params.get('sortOrder') === 'asc'
      );
      req.flush(mockProjectListResponse);
    });
  });

  describe('getProject', () => {
    it('should get project by id', () => {
      service.getProject('1').subscribe(project => {
        expect(project).toEqual(mockProject);
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects/1');
      expect(req.request.method).toBe('GET');
      req.flush(mockProject);
    });

    it('should handle get project error', () => {
      service.getProject('1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.error()).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects/1');
      req.flush('Project not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createProject', () => {
    it('should create project successfully', () => {
      const createRequest: CreateProjectRequest = {
        name: 'New Project',
        description: 'New Description',
        status: 'draft'
      };

      // Set initial projects
      service['_projects'].set([]);

      service.createProject(createRequest).subscribe(project => {
        expect(project).toEqual(mockProject);
        expect(service.projects()).toContain(mockProject);
        expect(service.loading()).toBeFalsy();
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush(mockProject);
    });

    it('should handle create project error', () => {
      const createRequest: CreateProjectRequest = {
        name: 'New Project',
        description: 'New Description'
      };

      service.createProject(createRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.loading()).toBeFalsy();
          expect(service.error()).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      req.flush('Validation error', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', () => {
      const updateRequest: UpdateProjectRequest = {
        name: 'Updated Project',
        status: 'completed'
      };

      const updatedProject = { ...mockProject, ...updateRequest };

      // Set initial projects
      service['_projects'].set([mockProject]);

      service.updateProject('1', updateRequest).subscribe(project => {
        expect(project).toEqual(updatedProject);
        expect(service.projects().find(p => p.id === '1')).toEqual(updatedProject);
        expect(service.loading()).toBeFalsy();
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateRequest);
      req.flush(updatedProject);
    });

    it('should handle update project error', () => {
      const updateRequest: UpdateProjectRequest = {
        name: 'Updated Project'
      };

      service.updateProject('1', updateRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.loading()).toBeFalsy();
          expect(service.error()).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects/1');
      req.flush('Update failed', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', () => {
      // Set initial projects
      service['_projects'].set([mockProject]);

      service.deleteProject('1').subscribe(() => {
        expect(service.projects().find(p => p.id === '1')).toBeUndefined();
        expect(service.loading()).toBeFalsy();
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle delete project error', () => {
      service.deleteProject('1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.loading()).toBeFalsy();
          expect(service.error()).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects/1');
      req.flush('Delete failed', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('utility methods', () => {
    it('should search projects correctly', () => {
      const projects = [
        { ...mockProject, name: 'Angular Project', description: 'Frontend project' },
        { ...mockProject, id: '2', name: 'Backend API', description: 'Node.js API' },
        { ...mockProject, id: '3', name: 'Database', description: 'PostgreSQL setup', status: 'completed' as const }
      ];

      service['_projects'].set(projects);

      // Search by name
      expect(service.searchProjects('Angular').length).toBe(1);
      expect(service.searchProjects('Angular')[0].name).toBe('Angular Project');

      // Search by description
      expect(service.searchProjects('Node.js').length).toBe(1);
      expect(service.searchProjects('Node.js')[0].name).toBe('Backend API');

      // Search by status
      expect(service.searchProjects('completed').length).toBe(1);
      expect(service.searchProjects('completed')[0].status).toBe('completed');

      // Empty search returns all
      expect(service.searchProjects('').length).toBe(3);
      expect(service.searchProjects('   ').length).toBe(3);

      // No matches
      expect(service.searchProjects('nonexistent').length).toBe(0);
    });

    it('should sort projects correctly', () => {
      const projects = [
        { ...mockProject, name: 'C Project', updatedAt: '2025-08-01T10:00:00Z' },
        { ...mockProject, id: '2', name: 'A Project', updatedAt: '2025-08-03T10:00:00Z' },
        { ...mockProject, id: '3', name: 'B Project', updatedAt: '2025-08-02T10:00:00Z' }
      ];

      // Sort by name ascending
      const sortedByNameAsc = service.sortProjects(projects, 'name', 'asc');
      expect(sortedByNameAsc.map(p => p.name)).toEqual(['A Project', 'B Project', 'C Project']);

      // Sort by name descending
      const sortedByNameDesc = service.sortProjects(projects, 'name', 'desc');
      expect(sortedByNameDesc.map(p => p.name)).toEqual(['C Project', 'B Project', 'A Project']);

      // Sort by updatedAt descending (default)
      const sortedByDateDesc = service.sortProjects(projects, 'updatedAt', 'desc');
      expect(sortedByDateDesc.map(p => p.id)).toEqual(['2', '3', '1']);
    });

    it('should clear error', () => {
      service['_error'].set('Test error');
      expect(service.error()).toBe('Test error');

      service.clearError();
      expect(service.error()).toBeNull();
    });

    it('should refresh projects', () => {
      service.refreshProjects().subscribe();

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      expect(req.request.method).toBe('GET');
      req.flush(mockProjectListResponse);
    });
  });

  describe('error message handling', () => {
    it('should return appropriate error messages for connection errors', fakeAsync(() => {
      // Test connection error
      service.loadProjects().subscribe({
        error: (error) => {
          // Error callback - error signal will be set by this point
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      req.error(new ProgressEvent('error'));
      tick();
      
      expect(service.error()).toBe('Unable to connect to server. Please check your internet connection.');
    }));

    it('should handle 404 errors', fakeAsync(() => {
      service.getProject('nonexistent').subscribe({
        error: (error) => {
          // Error callback - error signal will be set by this point
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects/nonexistent');
      req.flush(null, { status: 404, statusText: 'Not Found' });
      tick();
      
      expect(service.error()).toBe('Project not found.');
    }));

    it('should handle 400 errors', fakeAsync(() => {
      service.createProject({ name: '' }).subscribe({
        error: (error) => {
          // Error callback - error signal will be set by this point
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      req.flush(null, { status: 400, statusText: 'Bad Request' });
      tick();
      
      expect(service.error()).toBe('Invalid request. Please check your input.');
    }));

    it('should handle server errors with custom message', fakeAsync(() => {
      service.loadProjects().subscribe({
        error: () => {
          // Error callback - error signal will be set by this point
        }
      });

      const req = httpMock.expectOne('http://localhost:3001/api/v1/projects');
      req.flush({ message: 'Custom error message' }, { status: 500, statusText: 'Internal Server Error' });
      tick();
      
      expect(service.error()).toBe('Custom error message');
    }));
  });
});
