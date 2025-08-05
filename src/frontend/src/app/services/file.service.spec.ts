import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FileService, ProjectFile, FileUploadProgress } from './file.service';
import { environment } from '../../environments/environment';

describe('FileService', () => {
  let service: FileService;
  let httpMock: HttpTestingController;
  const mockProjectId = 'test-project-123';
  const mockApiUrl = `${environment.apiUrl}/projects/${mockProjectId}/files`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FileService]
    });
    service = TestBed.inject(FileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProjectFiles', () => {
    it('should fetch project files and update signal', () => {
      const mockFiles: ProjectFile[] = [
        {
          id: '1',
          filename: 'test.txt',
          size: 1024,
          type: 'text/plain',
          uploadDate: '2025-01-08T10:00:00Z',
          path: '/test.txt'
        },
        {
          id: '2',
          filename: 'readme.md',
          size: 2048,
          type: 'text/markdown',
          uploadDate: '2025-01-08T10:30:00Z',
          path: '/readme.md'
        }
      ];

      service.getProjectFiles(mockProjectId).subscribe(files => {
        expect(files).toEqual(mockFiles);
        expect(service.files()).toEqual(mockFiles);
        expect(service.isLoading()).toBe(false);
      });

      expect(service.isLoading()).toBe(true);
      const req = httpMock.expectOne(mockApiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockFiles);
    });

    it('should handle error and update error signal', () => {
      const errorMessage = 'File or project not found.';

      service.getProjectFiles(mockProjectId).subscribe({
        error: (error) => {
          expect(error).toBe(errorMessage);
          expect(service.error()).toBe(errorMessage);
          expect(service.isLoading()).toBe(false);
        }
      });

      const req = httpMock.expectOne(mockApiUrl);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('deleteFile', () => {
    it('should delete file and remove from files signal', () => {
      const mockFiles: ProjectFile[] = [
        { id: '1', filename: 'test.txt', size: 1024, type: 'text/plain', uploadDate: '2025-01-08T10:00:00Z', path: '/test.txt' },
        { id: '2', filename: 'readme.md', size: 2048, type: 'text/markdown', uploadDate: '2025-01-08T10:30:00Z', path: '/readme.md' }
      ];

      // Set initial files
      service.files.set(mockFiles);

      service.deleteFile(mockProjectId, '1').subscribe(() => {
        const remainingFiles = service.files();
        expect(remainingFiles.length).toBe(1);
        expect(remainingFiles[0].id).toBe('2');
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });

    it('should handle delete error', () => {
      service.deleteFile(mockProjectId, '1').subscribe({
        error: (error) => {
          expect(error).toBe('You do not have permission to perform this action.');
          expect(service.error()).toBe('You do not have permission to perform this action.');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('getFileContent', () => {
    it('should fetch file content as text', () => {
      const mockContent = 'This is test file content';
      const fileId = '1';

      service.getFileContent(mockProjectId, fileId).subscribe(content => {
        expect(content).toBe(mockContent);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/${fileId}/content`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('text');
      req.flush(mockContent);
    });

    it('should handle content fetch error', () => {
      const fileId = '1';

      service.getFileContent(mockProjectId, fileId).subscribe({
        error: (error) => {
          expect(error).toBe('File or project not found.');
          expect(service.error()).toBe('File or project not found.');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/${fileId}/content`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('downloadFile', () => {
    it('should download file as blob', () => {
      const mockBlob = new Blob(['test content'], { type: 'text/plain' });
      const fileId = '1';
      const filename = 'test.txt';

      // Mock URL.createObjectURL and document.createElement
      const mockUrl = 'blob:mock-url';
      spyOn(window.URL, 'createObjectURL').and.returnValue(mockUrl);
      spyOn(window.URL, 'revokeObjectURL');
      
      const mockLink = {
        href: '',
        download: '',
        click: jasmine.createSpy('click')
      } as any;
      spyOn(document, 'createElement').and.returnValue(mockLink);

      service.downloadFile(mockProjectId, fileId, filename).subscribe(blob => {
        expect(blob).toBe(mockBlob);
        expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockLink.href).toBe(mockUrl);
        expect(mockLink.download).toBe(filename);
        expect(mockLink.click).toHaveBeenCalled();
        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/${fileId}/download`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });
  });

  describe('renameFile', () => {
    it('should rename file and update files signal', () => {
      const originalFile: ProjectFile = {
        id: '1',
        filename: 'old-name.txt',
        size: 1024,
        type: 'text/plain',
        uploadDate: '2025-01-08T10:00:00Z',
        path: '/old-name.txt'
      };

      const updatedFile: ProjectFile = {
        ...originalFile,
        filename: 'new-name.txt',
        path: '/new-name.txt'
      };

      // Set initial files
      service.files.set([originalFile]);

      service.renameFile(mockProjectId, '1', 'new-name.txt').subscribe(file => {
        expect(file).toEqual(updatedFile);
        expect(service.files()[0]).toEqual(updatedFile);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ filename: 'new-name.txt' });
      req.flush(updatedFile);
    });
  });

  describe('utility methods', () => {
    it('should check if file is viewable', () => {
      expect(service.isFileViewable('test.txt')).toBe(true);
      expect(service.isFileViewable('readme.md')).toBe(true);
      expect(service.isFileViewable('config.json')).toBe(true);
      expect(service.isFileViewable('script.js')).toBe(true);
      expect(service.isFileViewable('component.ts')).toBe(true);
      expect(service.isFileViewable('style.css')).toBe(true);
      expect(service.isFileViewable('config.yml')).toBe(true);
      expect(service.isFileViewable('config.yaml')).toBe(true);
      expect(service.isFileViewable('index.html')).toBe(true);
      
      expect(service.isFileViewable('image.png')).toBe(false);
      expect(service.isFileViewable('document.pdf')).toBe(false);
      expect(service.isFileViewable('archive.zip')).toBe(false);
    });

    it('should get correct file icon', () => {
      expect(service.getFileIcon('test.txt')).toBe('description');
      expect(service.getFileIcon('readme.md')).toBe('article');
      expect(service.getFileIcon('config.json')).toBe('data_object');
      expect(service.getFileIcon('script.js')).toBe('code');
      expect(service.getFileIcon('component.ts')).toBe('code');
      expect(service.getFileIcon('style.css')).toBe('style');
      expect(service.getFileIcon('config.yml')).toBe('settings');
      expect(service.getFileIcon('config.yaml')).toBe('settings');
      expect(service.getFileIcon('index.html')).toBe('web');
      expect(service.getFileIcon('document.pdf')).toBe('picture_as_pdf');
      expect(service.getFileIcon('unknown.xyz')).toBe('insert_drive_file');
    });

    it('should format file size correctly', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes');
      expect(service.formatFileSize(1024)).toBe('1 KB');
      expect(service.formatFileSize(1048576)).toBe('1 MB');
      expect(service.formatFileSize(1073741824)).toBe('1 GB');
      expect(service.formatFileSize(512)).toBe('512 Bytes');
      expect(service.formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('state management', () => {
    it('should clear error', () => {
      service.error.set('Test error');
      expect(service.error()).toBe('Test error');
      
      service.clearError();
      expect(service.error()).toBeNull();
    });

    it('should clear upload progress', () => {
      const mockProgress: FileUploadProgress[] = [
        { filename: 'test.txt', progress: 50, status: 'uploading' }
      ];
      
      service.uploadProgress.set(mockProgress);
      expect(service.uploadProgress()).toEqual(mockProgress);
      
      service.clearUploadProgress();
      expect(service.uploadProgress()).toEqual([]);
    });
  });
});
