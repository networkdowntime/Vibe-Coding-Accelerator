import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open', 'dismiss']);

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    });

    service = TestBed.inject(NotificationService);
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('showSuccess', () => {
    it('should show success notification with default action', () => {
      const message = 'Success message';
      service.showSuccess(message);

      expect(mockSnackBar.open).toHaveBeenCalledWith(message, undefined, {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['success-snackbar']
      });
    });

    it('should show success notification with custom action', () => {
      const message = 'Success message';
      const action = 'Undo';
      service.showSuccess(message, action);

      expect(mockSnackBar.open).toHaveBeenCalledWith(message, action, {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['success-snackbar']
      });
    });
  });

  describe('showError', () => {
    it('should show error notification with default action', () => {
      const message = 'Error message';
      service.showError(message);

      expect(mockSnackBar.open).toHaveBeenCalledWith(message, undefined, {
        duration: 6000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    });

    it('should show error notification with custom action', () => {
      const message = 'Error message';
      const action = 'Retry';
      service.showError(message, action);

      expect(mockSnackBar.open).toHaveBeenCalledWith(message, action, {
        duration: 6000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    });
  });

  describe('showWarning', () => {
    it('should show warning notification with default action', () => {
      const message = 'Warning message';
      service.showWarning(message);

      expect(mockSnackBar.open).toHaveBeenCalledWith(message, undefined, {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['warning-snackbar']
      });
    });

    it('should show warning notification with custom action', () => {
      const message = 'Warning message';
      const action = 'Dismiss';
      service.showWarning(message, action);

      expect(mockSnackBar.open).toHaveBeenCalledWith(message, action, {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['warning-snackbar']
      });
    });
  });

  describe('showInfo', () => {
    it('should show info notification with default action', () => {
      const message = 'Info message';
      service.showInfo(message);

      expect(mockSnackBar.open).toHaveBeenCalledWith(message, undefined, {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['info-snackbar']
      });
    });

    it('should show info notification with custom action', () => {
      const message = 'Info message';
      const action = 'Got it';
      service.showInfo(message, action);

      expect(mockSnackBar.open).toHaveBeenCalledWith(message, action, {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['info-snackbar']
      });
    });
  });

  describe('dismiss', () => {
    it('should dismiss all snackbars', () => {
      service.dismiss();
      expect(mockSnackBar.dismiss).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      service.showSuccess('');
      expect(mockSnackBar.open).toHaveBeenCalledWith('', undefined, {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['success-snackbar']
      });
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(500);
      service.showError(longMessage);
      expect(mockSnackBar.open).toHaveBeenCalledWith(longMessage, undefined, {
        duration: 6000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    });

    it('should handle empty action string', () => {
      const message = 'Test message';
      service.showInfo(message, '');
      expect(mockSnackBar.open).toHaveBeenCalledWith(message, '', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['info-snackbar']
      });
    });
  });

  describe('notification types consistency', () => {
    it('should use different CSS classes for different notification types', () => {
      const message = 'Test';
      
      service.showSuccess(message);
      service.showError(message);
      service.showWarning(message);
      service.showInfo(message);

      const calls = mockSnackBar.open.calls.all();
      
      expect(calls[0].args[2]?.panelClass).toEqual(['success-snackbar']);
      expect(calls[1].args[2]?.panelClass).toEqual(['error-snackbar']);
      expect(calls[2].args[2]?.panelClass).toEqual(['warning-snackbar']);
      expect(calls[3].args[2]?.panelClass).toEqual(['info-snackbar']);
    });

    it('should use appropriate default durations for different notification types', () => {
      const message = 'Test';
      
      service.showSuccess(message);
      service.showError(message);
      service.showWarning(message);
      service.showInfo(message);

      const calls = mockSnackBar.open.calls.all();
      
      expect(calls[0].args[2]?.duration).toBe(4000); // success
      expect(calls[1].args[2]?.duration).toBe(6000); // error (longer)
      expect(calls[2].args[2]?.duration).toBe(4000); // warning
      expect(calls[3].args[2]?.duration).toBe(4000); // info
    });

    it('should use consistent positioning for all notification types', () => {
      const message = 'Test';
      
      service.showSuccess(message);
      service.showError(message);
      service.showWarning(message);
      service.showInfo(message);

      const calls = mockSnackBar.open.calls.all();
      
      calls.forEach(call => {
        expect(call.args[2]?.horizontalPosition).toBe('end');
        expect(call.args[2]?.verticalPosition).toBe('bottom');
      });
    });
  });
});
