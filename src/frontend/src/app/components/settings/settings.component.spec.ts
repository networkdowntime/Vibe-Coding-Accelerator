import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { SettingsComponent } from './settings.component';
import { SettingsService } from '../../services/settings.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SettingsComponent>>;

  beforeEach(async () => {
    const settingsServiceSpy = jasmine.createSpyObj('SettingsService', [
      'getSettings',
      'updateSettings',
      'testConnection'
    ]);
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        SettingsComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatSnackBarModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<SettingsComponent>>;
  });

  beforeEach(() => {
    // Setup default service responses
    settingsService.getSettings.and.returnValue(of({
      llmEndpoint: '',
      hasApiKey: false,
      isConfigured: false
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load settings on init', () => {
    const mockSettings = {
      llmEndpoint: 'https://api.openai.com',
      hasApiKey: true,
      isConfigured: true
    };

    settingsService.getSettings.and.returnValue(of(mockSettings));

    component.ngOnInit();

    expect(settingsService.getSettings).toHaveBeenCalled();
    expect(component.currentSettings()).toEqual(mockSettings);
  });

  it('should validate required fields', () => {
    component.ngOnInit();
    fixture.detectChanges();

    const form = component.settingsForm;
    expect(form.valid).toBeFalsy();

    form.patchValue({
      llmEndpoint: 'https://api.openai.com',
      llmApiKey: 'sk-test123'
    });

    expect(form.valid).toBeTruthy();
  });

  it('should validate URL format', () => {
    component.ngOnInit();
    fixture.detectChanges();

    const form = component.settingsForm;
    form.patchValue({
      llmEndpoint: 'invalid-url',
      llmApiKey: 'sk-test123'
    });

    expect(form.get('llmEndpoint')?.errors?.['pattern']).toBeTruthy();
  });

  it('should save settings successfully', () => {
    settingsService.updateSettings.and.returnValue(of('Settings updated successfully'));

    component.ngOnInit();
    fixture.detectChanges();

    component.settingsForm.patchValue({
      llmEndpoint: 'https://api.openai.com',
      llmApiKey: 'sk-test123'
    });

    component.onSaveSettings();

    expect(settingsService.updateSettings).toHaveBeenCalledWith({
      llmEndpoint: 'https://api.openai.com',
      llmApiKey: 'sk-test123'
    });
    expect(component.isSaving()).toBeFalsy();
  });

  it('should handle save settings error', () => {
    settingsService.updateSettings.and.returnValue(
      throwError(() => new Error('Failed to save'))
    );

    component.ngOnInit();
    fixture.detectChanges();

    component.settingsForm.patchValue({
      llmEndpoint: 'https://api.openai.com',
      llmApiKey: 'sk-test123'
    });

    component.onSaveSettings();

    expect(component.isSaving()).toBeFalsy();
  });

  it('should test connection successfully', () => {
    settingsService.testConnection.and.returnValue(of('Connection successful'));

    component.ngOnInit();
    fixture.detectChanges();

    component.settingsForm.patchValue({
      llmEndpoint: 'https://api.openai.com',
      llmApiKey: 'sk-test123'
    });

    component.onTestConnection();

    expect(settingsService.testConnection).toHaveBeenCalledWith({
      llmEndpoint: 'https://api.openai.com',
      llmApiKey: 'sk-test123'
    });
    expect(component.isTesting()).toBeFalsy();
  });

  it('should handle test connection error', () => {
    settingsService.testConnection.and.returnValue(
      throwError(() => new Error('Connection failed'))
    );

    component.ngOnInit();
    fixture.detectChanges();

    component.settingsForm.patchValue({
      llmEndpoint: 'https://api.openai.com',
      llmApiKey: 'sk-test123'
    });

    component.onTestConnection();

    expect(component.isTesting()).toBeFalsy();
  });

  it('should toggle API key visibility', () => {
    expect(component.showApiKey()).toBeFalsy();

    component.toggleApiKeyVisibility();

    expect(component.showApiKey()).toBeTruthy();

    component.toggleApiKeyVisibility();

    expect(component.showApiKey()).toBeFalsy();
  });
});
