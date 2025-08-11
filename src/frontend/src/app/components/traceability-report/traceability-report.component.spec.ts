import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { TraceabilityReportComponent } from './traceability-report.component';
import { TraceabilityService } from '../../services/traceability.service';
import { NotificationService } from '../../services/notification.service';

describe('TraceabilityReportComponent', () => {
  let component: TraceabilityReportComponent;
  let fixture: ComponentFixture<TraceabilityReportComponent>;
  let mockTraceabilityService: jasmine.SpyObj<TraceabilityService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSanitizer: jasmine.SpyObj<DomSanitizer>;

  const mockReport = {
    content: '# Test Report\n\nThis is a test report.',
    path: 'output/traceability-report.md'
  };

  const mockMetadata = {
    projectId: 'test-project',
    completenessScore: 85,
    generatedAt: '2025-08-09T12:00:00Z',
    totalFiles: 5,
    processedFiles: 4
  };

  const mockConsistencyStatus = {
    consistencyJobId: 'consistency_test_123',
    status: 'completed' as const,
    progress: 100,
    results: [
      {
        filename: 'test.js',
        status: 'corrected' as const,
        corrections: ['Fixed variable naming']
      }
    ],
    errors: [],
    startTime: '2025-08-09T11:00:00Z',
    endTime: '2025-08-09T11:05:00Z'
  };

  beforeEach(async () => {
    const traceabilityServiceSpy = jasmine.createSpyObj('TraceabilityService', [
      'getTraceabilityReport',
      'generateTraceabilityReport',
      'downloadReportFile',
      'startConsistencyCheck',
      'trackConsistencyCheck',
      'canStartConsistencyCheck',
      'formatConsistencyStatus',
      'getConsistencyResultsSummary'
    ], {
      activeConsistencyChecks$: of(new Map())
    });

    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'showSuccess',
      'showError'
    ]);

    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const sanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);

    await TestBed.configureTestingModule({
      imports: [TraceabilityReportComponent],
      providers: [
        { provide: TraceabilityService, useValue: traceabilityServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: DomSanitizer, useValue: sanitizerSpy }
      ]
    }).compileComponents();

    mockTraceabilityService = TestBed.inject(TraceabilityService) as jasmine.SpyObj<TraceabilityService>;
    mockNotificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    mockSanitizer = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;

    fixture = TestBed.createComponent(TraceabilityReportComponent);
    component = fixture.componentInstance;
    component.projectId = 'test-project';

    // Setup default sanitizer behavior
    mockSanitizer.bypassSecurityTrustHtml.and.returnValue('mocked html' as any);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load existing report on init', () => {
      mockTraceabilityService.getTraceabilityReport.and.returnValue(
        of({ success: true, data: mockReport })
      );

      component.ngOnInit();

      expect(mockTraceabilityService.getTraceabilityReport).toHaveBeenCalledWith('test-project');
      expect(component.reportContent).toBe(mockReport.content);
      expect(component.hasReport).toBe(true);
    });

    it('should handle no existing report gracefully', () => {
      mockTraceabilityService.getTraceabilityReport.and.returnValue(
        throwError(() => new Error('Report not found'))
      );

      component.ngOnInit();

      expect(component.reportContent).toBeNull();
      expect(component.hasReport).toBe(false);
    });

    it('should error when project ID is missing', () => {
      spyOn(console, 'error');
      component.projectId = '';

      component.ngOnInit();

      expect(console.error).toHaveBeenCalledWith('Project ID is required for traceability report');
    });
  });

  describe('runConsistencyCheck', () => {
    it('should start consistency check successfully', () => {
      mockTraceabilityService.canStartConsistencyCheck.and.returnValue(true);
      mockTraceabilityService.startConsistencyCheck.and.returnValue(
        of({
          success: true,
          consistencyJobId: 'test-job-123',
          message: 'Consistency check started',
          data: {
            consistencyJobId: 'test-job-123',
            status: 'starting',
            progress: 0
          }
        })
      );

      component.runConsistencyCheck();

      expect(mockTraceabilityService.startConsistencyCheck).toHaveBeenCalledWith({
        projectId: 'test-project'
      });
      expect(mockTraceabilityService.trackConsistencyCheck).toHaveBeenCalledWith('test-job-123');
      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith('Consistency check started');
      expect(component.isRunningConsistencyCheck).toBe(true);
    });

    it('should not start consistency check if already running', () => {
      mockTraceabilityService.canStartConsistencyCheck.and.returnValue(false);

      component.runConsistencyCheck();

      expect(mockTraceabilityService.startConsistencyCheck).not.toHaveBeenCalled();
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Consistency check is already running for this project'
      );
    });

    it('should handle start consistency check error', () => {
      mockTraceabilityService.canStartConsistencyCheck.and.returnValue(true);
      mockTraceabilityService.startConsistencyCheck.and.returnValue(
        throwError(() => new Error('API Error'))
      );

      component.runConsistencyCheck();

      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Failed to start consistency check: API Error'
      );
      expect(component.isRunningConsistencyCheck).toBe(false);
    });
  });

  describe('generateReport', () => {
    it('should generate report successfully', () => {
      mockTraceabilityService.generateTraceabilityReport.and.returnValue(
        of({
          success: true,
          message: 'Report generated',
          data: {
            reportPath: 'output/traceability-report.md',
            content: mockReport.content,
            metadata: mockMetadata
          }
        })
      );

      component.generateReport();

      expect(mockTraceabilityService.generateTraceabilityReport).toHaveBeenCalledWith('test-project');
      expect(component.reportContent).toBe(mockReport.content);
      expect(component.reportMetadata).toBe(mockMetadata);
      expect(component.hasReport).toBe(true);
      expect(component.isGenerating).toBe(false);
      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith(
        'Traceability report generated successfully'
      );
    });

    it('should handle generate report error', () => {
      mockTraceabilityService.generateTraceabilityReport.and.returnValue(
        throwError(() => new Error('Generation failed'))
      );

      component.generateReport();

      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Failed to generate report: Generation failed'
      );
      expect(component.isGenerating).toBe(false);
    });
  });

  describe('downloadReport', () => {
    it('should download report when available', () => {
      component.hasReport = true;

      component.downloadReport();

      expect(mockTraceabilityService.downloadReportFile).toHaveBeenCalledWith('test-project');
      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith('Report download started');
    });

    it('should show error when no report available', () => {
      component.hasReport = false;

      component.downloadReport();

      expect(mockTraceabilityService.downloadReportFile).not.toHaveBeenCalled();
      expect(mockNotificationService.showError).toHaveBeenCalledWith('No report available to download');
    });

    it('should handle download error', () => {
      component.hasReport = true;
      mockTraceabilityService.downloadReportFile.and.throwError('Download failed');

      component.downloadReport();

      expect(mockNotificationService.showError).toHaveBeenCalledWith('Failed to download report');
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      component.consistencyCheckStatus = mockConsistencyStatus;
    });

    it('should format consistency status', () => {
      mockTraceabilityService.formatConsistencyStatus.and.returnValue('Processing... (50%)');

      const result = component.formatConsistencyStatus(mockConsistencyStatus);

      expect(mockTraceabilityService.formatConsistencyStatus).toHaveBeenCalledWith(mockConsistencyStatus);
      expect(result).toBe('Processing... (50%)');
    });

    it('should get results summary', () => {
      mockTraceabilityService.getConsistencyResultsSummary.and.returnValue('1 file corrected');

      const result = component.getResultsSummary(mockConsistencyStatus);

      expect(mockTraceabilityService.getConsistencyResultsSummary).toHaveBeenCalledWith(mockConsistencyStatus);
      expect(result).toBe('1 file corrected');
    });

    it('should get corrected files', () => {
      const correctedFiles = component.getCorrectedFiles();

      expect(correctedFiles).toEqual([
        {
          filename: 'test.js',
          status: 'corrected',
          corrections: ['Fixed variable naming']
        }
      ]);
    });

    it('should format date', () => {
      const result = component.formatDate('2025-08-09T12:00:00Z');

      expect(result).toMatch(/8\/9\/2025/); // Basic date format check
    });
  });

  describe('markdown rendering', () => {
    it('should render basic markdown', async () => {
      component.reportContent = '# Test\n**bold** *italic*';

      await component['renderMarkdown']();

      expect(mockSanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
    });

    it('should handle empty content', async () => {
      component.reportContent = null;

      await component['renderMarkdown']();

      expect(mockSanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled();
    });

    it('should handle rendering errors', async () => {
      spyOn(console, 'error');
      component.reportContent = '# Test';
      mockSanitizer.bypassSecurityTrustHtml.and.throwError('Sanitizer error');

      await component['renderMarkdown']();

      expect(console.error).toHaveBeenCalled();
    });
  });
});
