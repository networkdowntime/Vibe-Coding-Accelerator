import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FileService, FileItem, FileUploadResponse, FileRenameResponse, FileDeleteResponse } from './file.service';

describe('FileService', () => {
  let service: FileService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:3001/api/projects';

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

  describe('listFiles', () => {
    it('should retrieve files for a project', () => {
      const mockFiles: FileItem[] = [
        {
          name: 'test.txt',
          size: 1024,
          type: '.txt',
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z'
        },
        {
          name: 'readme.md',
          size: 2048,
          type: '.md',
          createdAt: '2023-01-02T00:00:00Z',
          modifiedAt: '2023-01-02T00:00:00Z'
        }
      ];

      service.listFiles('testproject').subscribe(files => {
        expect(files).toEqual(mockFiles);
        expect(files.length).toBe(2);
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files`);
      expect(req.request.method).toBe('GET');
      req.flush(mockFiles);
    });

    it('should handle error when listing files', () => {
      service.listFiles('testproject').subscribe({
        next: () => fail('expected an error'),
        error: error => {
          expect(error.message).toContain('Project not found');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files`);
      req.flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const mockResponse: FileUploadResponse = {
        name: 'test.txt',
        size: 7,
        type: '.txt',
        message: 'File uploaded successfully'
      };

      service.uploadFile('testproject', mockFile).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle upload error', () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      service.uploadFile('testproject', mockFile).subscribe({
        next: () => fail('expected an error'),
        error: error => {
          expect(error.message).toContain('Unsupported file type');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files`);
      req.flush({ error: 'Unsupported file type' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getFileContent', () => {
    it('should retrieve file content as blob', () => {
      const mockBlob = new Blob(['file content'], { type: 'text/plain' });

      service.getFileContent('testproject', 'test.txt').subscribe(blob => {
        expect(blob).toEqual(mockBlob);
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files/test.txt`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });
  });

  describe('renameFile', () => {
    it('should rename a file successfully', () => {
      const mockResponse: FileRenameResponse = {
        oldName: 'old.txt',
        newName: 'new.txt',
        message: 'File renamed successfully'
      };

      service.renameFile('testproject', 'old.txt', 'new.txt').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files/old.txt`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ newName: 'new.txt' });
      req.flush(mockResponse);
    });

    it('should handle rename error for duplicate names', () => {
      service.renameFile('testproject', 'old.txt', 'existing.txt').subscribe({
        next: () => fail('expected an error'),
        error: error => {
          expect(error.message).toContain('File with new name already exists');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files/old.txt`);
      req.flush({ error: 'File with new name already exists' }, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', () => {
      const mockResponse: FileDeleteResponse = {
        name: 'test.txt',
        message: 'File deleted successfully'
      };

      service.deleteFile('testproject', 'test.txt').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files/test.txt`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle delete error for non-existent file', () => {
      service.deleteFile('testproject', 'nonexistent.txt').subscribe({
        next: () => fail('expected an error'),
        error: error => {
          expect(error.message).toContain('File not found');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/testproject/files/nonexistent.txt`);
      req.flush({ error: 'File not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('utility methods', () => {
    it('should check if file type is supported', () => {
      expect(service.isSupportedFileType('test.txt')).toBe(true);
      expect(service.isSupportedFileType('readme.md')).toBe(true);
      expect(service.isSupportedFileType('config.yml')).toBe(true);
      expect(service.isSupportedFileType('config.yaml')).toBe(true);
      expect(service.isSupportedFileType('index.html')).toBe(true);
      expect(service.isSupportedFileType('document.pdf')).toBe(true);
      expect(service.isSupportedFileType('script.js')).toBe(false);
      expect(service.isSupportedFileType('image.png')).toBe(false);
    });

    it('should format file size correctly', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes');
      expect(service.formatFileSize(1024)).toBe('1 KB');
      expect(service.formatFileSize(1048576)).toBe('1 MB');
      expect(service.formatFileSize(1073741824)).toBe('1 GB');
      expect(service.formatFileSize(512)).toBe('512 Bytes');
      expect(service.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should return correct file icon class', () => {
      expect(service.getFileIconClass('test.txt')).toBe('file-text');
      expect(service.getFileIconClass('readme.md')).toBe('file-markdown');
      expect(service.getFileIconClass('config.yml')).toBe('file-yaml');
      expect(service.getFileIconClass('config.yaml')).toBe('file-yaml');
      expect(service.getFileIconClass('index.html')).toBe('file-html');
      expect(service.getFileIconClass('document.pdf')).toBe('file-pdf');
      expect(service.getFileIconClass('unknown.xyz')).toBe('file-generic');
    });

    it('should generate correct file URL', () => {
      const url = service.getFileUrl('testproject', 'test.txt');
      expect(url).toBe(`${baseUrl}/testproject/files/test.txt`);
    });
  });
});
