import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LlmProgressComponent } from './llm-progress.component';
import { LlmService, LLMJobStatus, ProcessingState } from '../../services/llm.service';
import { BehaviorSubject, of, throwError } from 'rxjs';

describe('LlmProgressComponent', () => {
  let component: LlmProgressComponent;
  let fixture: ComponentFixture<LlmProgressComponent>;
  let llmService: jasmine.SpyObj<LlmService>;
  let processingStateSubject: BehaviorSubject<ProcessingState>;

  const mockInitialState: ProcessingState = {
    isProcessing: false,
    currentJob: null,
    error: null
  };

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

  beforeEach(async () => {
    processingStateSubject = new BehaviorSubject<ProcessingState>(mockInitialState);
    
    const llmServiceSpy = jasmine.createSpyObj('LlmService', [
      'startProcessing',
      'cancelProcessing',
      'retryProcessing',
      'resetProcessing'
    ], {
      processingState$: processingStateSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [LlmProgressComponent, HttpClientTestingModule],
      providers: [
        { provide: LlmService, useValue: llmServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LlmProgressComponent);
    component = fixture.componentInstance;
    llmService = TestBed.inject(LlmService) as jasmine.SpyObj<LlmService>;
    
    component.projectId = 'test-project';
    component.visible = true;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default state', () => {
    expect(component.processingState).toEqual(mockInitialState);
    expect(component.showRetryModal).toBeFalse();
    expect(component.showCancelModal).toBeFalse();
    expect(component.showErrorModal).toBeFalse();
  });

  describe('Processing State Management', () => {
    it('should update processing state when service state changes', () => {
      const newState: ProcessingState = {
        isProcessing: true,
        currentJob: mockJobStatus,
        error: null
      };

      processingStateSubject.next(newState);

      expect(component.processingState).toEqual(newState);
    });

    it('should emit onComplete when job completes successfully', () => {
      spyOn(component.onComplete, 'emit');

      const completedState: ProcessingState = {
        isProcessing: false,
        currentJob: { ...mockJobStatus, status: 'completed' },
        error: null
      };

      processingStateSubject.next(completedState);

      expect(component.onComplete.emit).toHaveBeenCalledWith({
        jobId: 'test-job-id',
        success: true
      });
    });

    it('should show error modal when job fails', () => {
      const failedState: ProcessingState = {
        isProcessing: false,
        currentJob: { ...mockJobStatus, status: 'failed' },
        error: 'Processing failed'
      };

      processingStateSubject.next(failedState);

      expect(component.showErrorModal).toBeTrue();
      expect(component.errorMessage).toBe('Processing failed');
    });

    it('should emit onError when processing fails', () => {
      spyOn(component.onError, 'emit');

      const errorState: ProcessingState = {
        isProcessing: false,
        currentJob: null,
        error: 'Service error'
      };

      processingStateSubject.next(errorState);

      expect(component.onError.emit).toHaveBeenCalledWith('Service error');
    });
  });

  describe('Start Processing', () => {
    it('should start processing when projectId is provided', () => {
      llmService.startProcessing.and.returnValue(of({
        jobId: 'new-job-id',
        status: 'pending',
        message: 'Processing started'
      }));

      component.startProcessing();

      expect(llmService.startProcessing).toHaveBeenCalledWith('test-project');
    });

    it('should show error when no projectId is provided', () => {
      component.projectId = '';

      component.startProcessing();

      expect(component.showErrorModal).toBeTrue();
      expect(component.errorMessage).toBe('No project selected');
      expect(llmService.startProcessing).not.toHaveBeenCalled();
    });

    it('should handle start processing errors', () => {
      llmService.startProcessing.and.returnValue(throwError(() => new Error('Start failed')));

      component.startProcessing();

      expect(component.showErrorModal).toBeTrue();
      expect(component.errorMessage).toBe('Start failed');
    });
  });

  describe('Cancel Processing', () => {
    beforeEach(() => {
      component.processingState = {
        isProcessing: true,
        currentJob: mockJobStatus,
        error: null
      };
    });

    it('should show cancel confirmation modal', () => {
      component.confirmCancel();

      expect(component.showCancelModal).toBeTrue();
    });

    it('should cancel processing when confirmed', () => {
      llmService.cancelProcessing.and.returnValue(of({
        jobId: 'test-job-id',
        status: 'cancelled',
        message: 'Processing cancelled'
      }));

      spyOn(component, 'close');

      component.cancelProcessing();

      expect(llmService.cancelProcessing).toHaveBeenCalledWith('test-job-id');
      expect(component.showCancelModal).toBeFalse();
      expect(component.close).toHaveBeenCalled();
    });

    it('should handle cancel processing errors', () => {
      llmService.cancelProcessing.and.returnValue(throwError(() => new Error('Cancel failed')));

      component.cancelProcessing();

      expect(component.showErrorModal).toBeTrue();
      expect(component.errorMessage).toBe('Cancel failed');
      expect(component.showCancelModal).toBeFalse();
    });
  });

  describe('Retry Processing', () => {
    beforeEach(() => {
      component.processingState = {
        isProcessing: false,
        currentJob: { ...mockJobStatus, status: 'failed' },
        error: 'Processing failed'
      };
    });

    it('should retry processing when job failed', () => {
      llmService.retryProcessing.and.returnValue(of({
        jobId: 'test-job-id',
        status: 'pending',
        message: 'Processing restarted',
        retryCount: 1
      }));

      component.retryProcessing();

      expect(llmService.retryProcessing).toHaveBeenCalledWith('test-job-id');
      expect(component.showRetryModal).toBeFalse();
      expect(component.showErrorModal).toBeFalse();
    });

    it('should handle retry processing errors', () => {
      llmService.retryProcessing.and.returnValue(throwError(() => new Error('Retry failed')));

      component.retryProcessing();

      expect(component.showErrorModal).toBeTrue();
      expect(component.errorMessage).toBe('Retry failed');
      expect(component.showRetryModal).toBeFalse();
    });
  });

  describe('UI State Methods', () => {
    it('should calculate progress width correctly', () => {
      component.processingState = {
        isProcessing: true,
        currentJob: mockJobStatus,
        error: null
      };

      expect(component.getProgressWidth()).toBe('50%');
    });

    it('should return 0% when no current job', () => {
      // Ensure the processing state has no current job
      component.processingState = {
        isProcessing: false,
        currentJob: null,
        error: null
      };
      expect(component.getProgressWidth()).toBe('0%');
    });

    it('should generate appropriate progress text', () => {
      component.processingState = {
        isProcessing: true,
        currentJob: mockJobStatus,
        error: null
      };

      const progressText = component.getProgressText();
      expect(progressText).toContain('Processing test-file.js');
      expect(progressText).toContain('(5/10)');
    });

    it('should return correct status icons', () => {
      // Test different statuses
      component.processingState.currentJob = { ...mockJobStatus, status: 'pending' };
      expect(component.getStatusIcon()).toBe('fas fa-clock');

      component.processingState.currentJob = { ...mockJobStatus, status: 'processing' };
      expect(component.getStatusIcon()).toBe('fas fa-spinner fa-spin');

      component.processingState.currentJob = { ...mockJobStatus, status: 'completed' };
      expect(component.getStatusIcon()).toBe('fas fa-check-circle text-green-500');

      component.processingState.currentJob = { ...mockJobStatus, status: 'failed' };
      expect(component.getStatusIcon()).toBe('fas fa-exclamation-circle text-red-500');
    });

    it('should determine when retry is possible', () => {
      component.processingState.currentJob = { ...mockJobStatus, status: 'failed' };
      expect(component.canRetry()).toBeTrue();

      component.processingState.currentJob = { ...mockJobStatus, status: 'completed' };
      expect(component.canRetry()).toBeFalse();
    });

    it('should determine when cancel is possible', () => {
      component.processingState.currentJob = { ...mockJobStatus, status: 'processing' };
      expect(component.canCancel()).toBeTrue();

      component.processingState.currentJob = { ...mockJobStatus, status: 'completed' };
      expect(component.canCancel()).toBeFalse();
    });
  });

  describe('Modal Management', () => {
    it('should close error modal', () => {
      component.showErrorModal = true;
      component.errorMessage = 'Test error';

      component.closeErrorModal();

      expect(component.showErrorModal).toBeFalse();
      expect(component.errorMessage).toBe('');
    });

    it('should close retry modal', () => {
      component.showRetryModal = true;

      component.closeRetryModal();

      expect(component.showRetryModal).toBeFalse();
    });

    it('should close cancel modal', () => {
      component.showCancelModal = true;

      component.closeCancelModal();

      expect(component.showCancelModal).toBeFalse();
    });

    it('should show retry dialog', () => {
      component.showRetryDialog();

      expect(component.showRetryModal).toBeTrue();
    });
  });

  describe('Component Lifecycle', () => {
    it('should emit onClose and reset service when closing', () => {
      spyOn(component.onClose, 'emit');

      component.close();

      expect(llmService.resetProcessing).toHaveBeenCalled();
      expect(component.onClose.emit).toHaveBeenCalled();
    });

    it('should unsubscribe on destroy', () => {
      spyOn(component['subscription'], 'unsubscribe');

      component.ngOnDestroy();

      expect(component['subscription'].unsubscribe).toHaveBeenCalled();
    });
  });
});
