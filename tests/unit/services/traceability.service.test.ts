import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TraceabilityService, TraceabilityReport, ReportGenerationResponse, ConsistencyCheckResponse } from '../../../src/frontend/src/app/core/services/traceability.service';
import { environment } from '../../../src/frontend/src/environments/environment';

describe('TraceabilityService', () => {
  let service: TraceabilityService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/traceability`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TraceabilityService]
    });
    service = TestBed.inject(TraceabilityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getReport', () => {
    it('should retrieve existing traceability report', () => {
      const mockReport: TraceabilityReport = {
        content: '# Test Report\n\nThis is a test report.',
        jobId: 'test-job-123'
      };

      service.getReport('test-job-123').subscribe(report => {
        expect(report).toEqual(mockReport);
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123`);
      expect(req.request.method).toBe('GET');
      req.flush(mockReport);
    });

    it('should handle 404 error when report not found', () => {
      service.getReport('nonexistent-job').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toContain('Report not found');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/nonexistent-job`);
      req.flush({ error: 'Report not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle network connectivity errors', () => {
      service.getReport('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toContain('Unable to connect to server');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123`);
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });
  });

  describe('generateReport', () => {
    it('should generate new traceability report', () => {
      const mockResponse: ReportGenerationResponse = {
        success: true,
        reportPath: '/exports/test-job-123/traceability-report.md',
        analysis: {
          projectId: 'test-project',
          completenessScore: 85
        },
        message: 'Traceability report generated successfully'
      };

      service.generateReport('test-job-123').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123/generate`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle server errors during report generation', () => {
      service.generateReport('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toContain('Server error: 500');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123/generate`);
      req.flush({ error: 'Internal server error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getReportContent', () => {
    it('should retrieve report content using alternative endpoint', () => {
      const mockReport: TraceabilityReport = {
        content: '# Alternative Report\n\nContent from alternative endpoint.',
        jobId: 'test-job-123'
      };

      service.getReportContent('test-job-123').subscribe(report => {
        expect(report).toEqual(mockReport);
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123/content`);
      expect(req.request.method).toBe('GET');
      req.flush(mockReport);
    });
  });

  describe('performConsistencyCheck', () => {
    it('should perform consistency check successfully', () => {
      const mockResponse: ConsistencyCheckResponse = {
        success: true,
        message: 'Consistency check completed',
        filesUpdated: ['file1.md', 'file2.md'],
        totalFilesChecked: 5
      };

      service.performConsistencyCheck('test-job-123').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/consistency/test-job-123`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle rate limiting during consistency check', () => {
      service.performConsistencyCheck('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toContain('Rate limit exceeded');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/consistency/test-job-123`);
      req.flush({ error: 'Rate limit exceeded' }, { status: 429, statusText: 'Too Many Requests' });
    });

    it('should handle unauthorized API access', () => {
      service.performConsistencyCheck('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toContain('Invalid API key');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/consistency/test-job-123`);
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('downloadReport', () => {
    it('should download report as blob', () => {
      const mockBlob = new Blob(['# Test Report\n\nContent'], { type: 'text/markdown' });

      service.downloadReport('test-job-123').subscribe(blob => {
        expect(blob).toEqual(mockBlob);
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123/download`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });

    it('should handle empty file content during download', () => {
      service.downloadReport('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toContain('No file content received');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123/download`);
      req.flush(null);
    });

    it('should handle file not found during download', () => {
      service.downloadReport('nonexistent-job').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toContain('Report not found');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/nonexistent-job/download`);
      req.flush({ error: 'File not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('error handling', () => {
    it('should handle client-side errors', () => {
      service.getReport('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toBe('Client-side error occurred');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123`);
      req.error(new ErrorEvent('Client error', { message: 'Client-side error occurred' }));
    });

    it('should handle server errors with custom error messages', () => {
      service.getReport('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toBe('Custom server error message');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123`);
      req.flush({ error: 'Custom server error message' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle server errors with message field', () => {
      service.getReport('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toBe('Server message error');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123`);
      req.flush({ message: 'Server message error' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle generic server errors', () => {
      service.getReport('test-job-123').subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.message).toBe('Server error: 500 Internal Server Error');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123`);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('service configuration', () => {
    it('should use correct base URL', () => {
      service.getReport('test-job-123').subscribe();
      
      const req = httpMock.expectOne(`${baseUrl}/report/test-job-123`);
      expect(req.request.url).toBe(`${environment.apiUrl}/api/traceability/report/test-job-123`);
      req.flush({});
    });

    it('should include proper headers for JSON requests', () => {
      service.performConsistencyCheck('test-job-123').subscribe();
      
      const req = httpMock.expectOne(`${baseUrl}/consistency/test-job-123`);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush({});
    });
  });
});
