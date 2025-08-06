import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectService, Project } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3001/api/projects';

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

  describe('getAllProjects', () => {
    it('should return projects', () => {
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

      service.getAllProjects().subscribe(projects => {
        expect(projects).toEqual(mockProjects);
        expect(projects.length).toBe(2);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockProjects);
    });

    it('should handle error response', () => {
      service.getAllProjects().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server Error');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ error: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('createProject', () => {
    it('should create a project', () => {
      const projectName = 'New Project';
      const mockResponse: Project = {
        name: 'newProject',
        displayName: 'New Project',
        createdAt: '2025-08-04T12:00:00Z',
        modifiedAt: '2025-08-04T12:00:00Z'
      };

      service.createProject(projectName).subscribe(project => {
        expect(project).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: projectName });
      req.flush(mockResponse);
    });

    it('should handle duplicate name error', () => {
      const projectName = 'Existing Project';

      service.createProject(projectName).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Project name already exists');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ error: 'Project name already exists' }, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('renameProject', () => {
    it('should rename a project', () => {
      const currentName = 'oldProject';
      const newName = 'New Name';
      const mockResponse: Project = {
        name: 'newName',
        displayName: 'New Name',
        createdAt: '2025-08-01T12:00:00Z',
        modifiedAt: '2025-08-04T12:00:00Z'
      };

      service.renameProject(currentName, newName).subscribe(project => {
        expect(project).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/${currentName}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ newName });
      req.flush(mockResponse);
    });

    it('should handle project not found error', () => {
      const currentName = 'nonexistent';
      const newName = 'New Name';

      service.renameProject(currentName, newName).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Project not found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${currentName}`);
      req.flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', () => {
      const projectName = 'testProject';
      const mockResponse = { name: projectName, message: 'Project deleted successfully' };

      service.deleteProject(projectName).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/${projectName}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle project not found error', () => {
      const projectName = 'nonexistent';

      service.deleteProject(projectName).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Project not found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${projectName}`);
      req.flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });
    });
  });
});
