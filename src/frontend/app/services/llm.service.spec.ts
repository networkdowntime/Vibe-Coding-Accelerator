import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LlmService, LLMJobStatus, LLMJobResult, ProcessingState } from './llm.service';
import { take } from 'rxjs/operators';
import { of } from 'rxjs';

describe('LlmService', () => {
  let service: LlmService;
  let httpMock: HttpTestingController;

  const mockJobStatus: LLMJobStatus = {
    jobId: 'test-job-id',
    projectId: 'test-project',
    status: 'processing',
    progress: {
      total: 10,
      completed: 5,
      failed: 0,
      current: 'test-file.js',
      percentage: 50
    },
    createdAt: '2025-08-04T10:00:00Z',
    startedAt: '2025-08-04T10:01:00Z'
  };

  const mockJobResult: LLMJobResult = {
    jobId: 'test-job-id',
    projectId: 'test-project',
    status: 'completed',
    summary: {
      jobId: 'test-job-id',
      totalFiles: 5,
      completedAt: '2025-08-04T12:00:00Z',
      files: []
    },
    exportPath: '/exports/test-job-id',
    processedFiles: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LlmService]
    });
    service = TestBed.inject(LlmService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startProcessing', () => {
    it('should start processing successfully', () => {
      const mockResponse = {
        jobId: 'new-job-id',
        status: 'pending',
        message: 'Processing started'
      };

      service.startProcessing('test-project').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/llm/process/test-project');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      req.flush(mockResponse);

      // Verify state was updated by checking the current state directly
      const currentState = service.getCurrentState();
      expect(currentState.isProcessing).toBeTrue();
      expect(currentState.currentJob?.jobId).toBe('new-job-id');
      expect(currentState.currentJob?.projectId).toBe('test-project');
      expect(currentState.currentJob?.status).toBe('pending');
    });

    it('should handle start processing errors', () => {
      service.startProcessing('test-project').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to start processing');
        }
      });

      const req = httpMock.expectOne('/api/llm/process/test-project');
      req.flush({ error: 'Failed to start processing' }, { status: 500, statusText: 'Server Error' });

      // Verify error state was updated by checking current state directly
      const currentState = service.getCurrentState();
      expect(currentState.isProcessing).toBeFalse();
      expect(currentState.error).toBe('Failed to start processing');
    });
  });

  describe('getJobStatus', () => {
    it('should get job status successfully', () => {
      service.getJobStatus('test-job-id').subscribe(status => {
        expect(status).toEqual(mockJobStatus);
      });

      const req = httpMock.expectOne('/api/llm/status/test-job-id');
      expect(req.request.method).toBe('GET');
      req.flush(mockJobStatus);
    });

    it('should handle get status errors', () => {
      service.getJobStatus('non-existent-job').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Job not found');
        }
      });

      const req = httpMock.expectOne('/api/llm/status/non-existent-job');
      req.flush({ error: 'Job not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('cancelProcessing', () => {
    it('should cancel processing successfully', () => {
      const mockResponse = {
        jobId: 'test-job-id',
        status: 'cancelled',
        message: 'Processing cancelled'
      };

      service.cancelProcessing('test-job-id').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/llm/cancel/test-job-id');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      req.flush(mockResponse);

      // Verify state was reset by checking current state directly
      const currentState = service.getCurrentState();
      expect(currentState.isProcessing).toBeFalse();
      expect(currentState.currentJob).toBeNull();
      expect(currentState.error).toBeNull();
    });

    it('should handle cancel processing errors', () => {
      service.cancelProcessing('test-job-id').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Cannot cancel completed job');
        }
      });

      const req = httpMock.expectOne('/api/llm/cancel/test-job-id');
      req.flush({ error: 'Cannot cancel completed job' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('retryProcessing', () => {
    it('should retry processing successfully', () => {
      const mockResponse = {
        jobId: 'test-job-id',
        status: 'pending',
        message: 'Processing restarted',
        retryCount: 1
      };

      // Set initial state with a failed job
      const currentState = service.getCurrentState();
      currentState.currentJob = { ...mockJobStatus, status: 'failed' };

      service.retryProcessing('test-job-id').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/llm/retry/test-job-id');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      req.flush(mockResponse);

      // Verify state was updated by checking the current state directly
      const newState = service.getCurrentState();
      expect(newState.isProcessing).toBeTrue();
      expect(newState.currentJob?.status).toBe('pending');
      expect(newState.error).toBeNull();
    });

    it('should handle retry processing errors', () => {
      service.retryProcessing('test-job-id').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Can only retry failed jobs');
        }
      });

      const req = httpMock.expectOne('/api/llm/retry/test-job-id');
      req.flush({ error: 'Can only retry failed jobs' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getResults', () => {
    it('should get processing results successfully', () => {
      service.getResults('test-job-id').subscribe(results => {
        expect(results).toEqual(mockJobResult);
      });

      const req = httpMock.expectOne('/api/llm/results/test-job-id');
      expect(req.request.method).toBe('GET');
      req.flush(mockJobResult);
    });

    it('should handle get results errors', () => {
      service.getResults('incomplete-job').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Job not completed yet');
        }
      });

      const req = httpMock.expectOne('/api/llm/results/incomplete-job');
      req.flush({ error: 'Job not completed yet' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('state management', () => {
    it('should reset processing state', () => {
      // Set some initial state
      service['updateProcessingState']({
        isProcessing: true,
        currentJob: mockJobStatus,
        error: 'Some error'
      });

      service.resetProcessing();

      const currentState = service.getCurrentState();
      expect(currentState.isProcessing).toBeFalse();
      expect(currentState.currentJob).toBeNull();
      expect(currentState.error).toBeNull();
    });

    it('should get current state', () => {
      const testState: ProcessingState = {
        isProcessing: true,
        currentJob: mockJobStatus,
        error: null
      };

      service['updateProcessingState'](testState);

      const currentState = service.getCurrentState();
      expect(currentState).toEqual(testState);
    });
  });

  describe('error handling', () => {
    it('should handle client-side errors', () => {
      const errorEvent = new ErrorEvent('Network error', { message: 'Network error' });

      service.getJobStatus('test-job-id').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Error: Network error');
        }
      });

      const req = httpMock.expectOne('/api/llm/status/test-job-id');
      req.error(errorEvent);
    });

    it('should handle server-side errors with custom message', () => {
      service.getJobStatus('test-job-id').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Custom error message');
        }
      });

      const req = httpMock.expectOne('/api/llm/status/test-job-id');
      req.flush({ error: 'Custom error message' }, { status: 500, statusText: 'Server Error' });
    });

    it('should handle server-side errors with default message', () => {
      service.getJobStatus('test-job-id').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Error 500: Http failure response for /api/llm/status/test-job-id: 500 Server Error');
        }
      });

      const req = httpMock.expectOne('/api/llm/status/test-job-id');
      req.flush(null, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('polling integration', () => {
    it('should start polling after successful processing start', () => {
      const mockStartResponse = {
        jobId: 'new-job-id',
        status: 'pending',
        message: 'Processing started'
      };

      // Mock the getJobStatus calls that will be made during polling
      spyOn(service, 'getJobStatus').and.returnValue(of({ 
        ...mockJobStatus, 
        status: 'processing' 
      }));

      service.startProcessing('test-project').subscribe(response => {
        expect(response).toEqual(mockStartResponse);
      });

      const req = httpMock.expectOne('/api/llm/process/test-project');
      req.flush(mockStartResponse);

      // Verify state was updated
      const currentState = service.getCurrentState();
      expect(currentState.isProcessing).toBeTrue();
      expect(currentState.currentJob?.jobId).toBe('new-job-id');
    });
  });
});
