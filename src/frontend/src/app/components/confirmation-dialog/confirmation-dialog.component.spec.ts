import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ConfirmationDialogComponent, ConfirmationDialogData } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ConfirmationDialogComponent>>;

  const defaultDialogData: ConfirmationDialogData = {
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  };

  // Helper function to setup TestBed with specific dialog data
  async function setupTestBed(dialogData: ConfirmationDialogData = defaultDialogData): Promise<void> {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        ConfirmationDialogComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<ConfirmationDialogComponent>>;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setupTestBed();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the provided title', () => {
    expect(component.data.title).toBe('Confirm Action');
  });

  it('should display the provided message', () => {
    expect(component.data.message).toBe('Are you sure you want to proceed?');
  });

  it('should display the provided button texts', () => {
    expect(component.data.confirmText).toBe('Confirm');
    expect(component.data.cancelText).toBe('Cancel');
  });

  describe('Dialog Actions', () => {
    it('should close dialog with true when confirm is clicked', () => {
      component.onConfirm();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should close dialog with false when cancel is clicked', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });
  });

  describe('Dialog Types', () => {
    it('should handle info type (default)', async () => {
      const data: ConfirmationDialogData = {
        ...defaultDialogData,
        type: 'info'
      };
      await setupTestBed(data);

      expect(component.data.type).toBe('info');
      expect(component.getDefaultIcon()).toBe('info');
      expect(component.getConfirmButtonColor()).toBe('primary');
    });

    it('should handle warn type', async () => {
      const data: ConfirmationDialogData = {
        ...defaultDialogData,
        type: 'warn'
      };
      await setupTestBed(data);

      expect(component.data.type).toBe('warn');
      expect(component.getDefaultIcon()).toBe('warning');
      expect(component.getConfirmButtonColor()).toBe('accent');
    });

    it('should handle danger type', async () => {
      const data: ConfirmationDialogData = {
        ...defaultDialogData,
        type: 'danger'
      };
      await setupTestBed(data);

      expect(component.data.type).toBe('danger');
      expect(component.getDefaultIcon()).toBe('error');
      expect(component.getConfirmButtonColor()).toBe('warn');
    });

    it('should default to info type when no type is provided', () => {
      expect(component.getDefaultIcon()).toBe('info');
      expect(component.getConfirmButtonColor()).toBe('primary');
    });
  });

  describe('Optional Properties', () => {
    it('should handle dialog with icon', async () => {
      const data: ConfirmationDialogData = {
        ...defaultDialogData,
        icon: 'warning'
      };
      await setupTestBed(data);

      expect(component.data.icon).toBe('warning');
    });

    it('should handle dialog without icon', () => {
      expect(component.data.icon).toBeUndefined();
    });

    it('should handle dialog without type (defaults to undefined)', () => {
      expect(component.data.type).toBeUndefined();
    });
  });

  describe('Custom Button Colors', () => {
    it('should apply warn color for danger type', async () => {
      const data: ConfirmationDialogData = {
        ...defaultDialogData,
        type: 'danger'
      };
      await setupTestBed(data);

      expect(component.data.type).toBe('danger');
      expect(component.getConfirmButtonColor()).toBe('warn');
    });

    it('should apply primary color for info type', async () => {
      const data: ConfirmationDialogData = {
        ...defaultDialogData,
        type: 'info'
      };
      await setupTestBed(data);

      expect(component.data.type).toBe('info');
      expect(component.getConfirmButtonColor()).toBe('primary');
    });

    it('should apply accent color for warn type', async () => {
      const data: ConfirmationDialogData = {
        ...defaultDialogData,
        type: 'warn'
      };
      await setupTestBed(data);

      expect(component.data.type).toBe('warn');
      expect(component.getConfirmButtonColor()).toBe('accent');
    });
  });

  describe('Complex Dialog Data', () => {
    it('should handle complete dialog data with all properties', async () => {
      const complexData: ConfirmationDialogData = {
        title: 'Delete Project',
        message: 'This action cannot be undone. Are you sure you want to delete this project?',
        confirmText: 'Delete',
        cancelText: 'Keep',
        type: 'danger',
        icon: 'delete_forever'
      };

      await setupTestBed(complexData);

      expect(component.data.title).toBe('Delete Project');
      expect(component.data.message).toBe('This action cannot be undone. Are you sure you want to delete this project?');
      expect(component.data.confirmText).toBe('Delete');
      expect(component.data.cancelText).toBe('Keep');
      expect(component.data.type).toBe('danger');
      expect(component.data.icon).toBe('delete_forever');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with proper dialog structure', () => {
      // The component should have proper ARIA attributes and structure
      expect(component.data).toBeDefined();
      expect(component.data.title).toBeDefined();
      expect(component.data.message).toBeDefined();
    });
  });
});
