import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SettingsService, OpenApiSettings, OpenApiUpdateRequest } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3001/api/settings';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SettingsService]
    });
    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadOpenApiSettings', () => {
    it('should load OpenAPI settings', () => {
      const mockSettings: OpenApiSettings = {
        endpoint: 'https://test-endpoint.com',
        hasApiKey: true,
        isConfigured: true
      };

      service.loadOpenApiSettings().subscribe(settings => {
        expect(settings).toEqual(mockSettings);
      });

      const req = httpMock.expectOne(`${apiUrl}/openapi`);
      expect(req.request.method).toBe('GET');
      req.flush(mockSettings);
    });

    it('should handle loading errors', () => {
      const errorMessage = 'Failed to load settings';
      spyOn(console, 'error');

      service.loadOpenApiSettings().subscribe({
        next: () => fail('Expected an error'),
        error: (error) => {
          expect(console.error).toHaveBeenCalledWith('Error loading OpenAPI settings:', error);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/openapi`);
      req.flush({ error: errorMessage }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('updateOpenApiSettings', () => {
    it('should update OpenAPI settings', () => {
      const updateRequest: OpenApiUpdateRequest = {
        endpoint: 'https://new-endpoint.com',
        apiKey: 'new-api-key'
      };

      const mockResponse = {
        message: 'Settings updated successfully',
        settings: {
          endpoint: 'https://new-endpoint.com',
          hasApiKey: true,
          isConfigured: true
        }
      };

      service.updateOpenApiSettings(updateRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/openapi`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateRequest);
      req.flush(mockResponse);
    });

    it('should handle update errors', () => {
      const updateRequest: OpenApiUpdateRequest = {
        endpoint: 'invalid-url',
        apiKey: 'test-key'
      };

      const errorMessage = 'Invalid endpoint URL format';
      spyOn(console, 'error');

      service.updateOpenApiSettings(updateRequest).subscribe({
        next: () => fail('Expected an error'),
        error: (error) => {
          expect(console.error).toHaveBeenCalledWith('Error updating OpenAPI settings:', error);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/openapi`);
      req.flush({ error: errorMessage }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('testOpenApiConnection', () => {
    it('should test connection successfully', () => {
      const mockResponse = {
        success: true,
        message: 'Connection successful'
      };

      service.testOpenApiConnection().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/openapi/test`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle connection test failures', () => {
      const mockResponse = {
        success: false,
        error: 'Connection failed',
        details: 'Endpoint not reachable'
      };

      service.testOpenApiConnection().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/openapi/test`);
      req.flush(mockResponse);
    });
  });

  describe('getCurrentSettings', () => {
    it('should return current settings from cache', () => {
      const mockSettings: OpenApiSettings = {
        endpoint: 'https://test-endpoint.com',
        hasApiKey: true,
        isConfigured: true
      };

      // First load settings to populate cache
      service.loadOpenApiSettings().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/openapi`);
      req.flush(mockSettings);

      // Then get current settings from cache
      const currentSettings = service.getCurrentSettings();
      expect(currentSettings).toEqual(mockSettings);
    });

    it('should return null when no settings cached', () => {
      const currentSettings = service.getCurrentSettings();
      expect(currentSettings).toBeNull();
    });
  });

  describe('isConfigured', () => {
    it('should return true when configured', () => {
      const mockSettings: OpenApiSettings = {
        endpoint: 'https://test-endpoint.com',
        hasApiKey: true,
        isConfigured: true
      };

      // Load settings to populate cache
      service.loadOpenApiSettings().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/openapi`);
      req.flush(mockSettings);

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when not configured', () => {
      const mockSettings: OpenApiSettings = {
        endpoint: '',
        hasApiKey: false,
        isConfigured: false
      };

      // Load settings to populate cache
      service.loadOpenApiSettings().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/openapi`);
      req.flush(mockSettings);

      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when no settings loaded', () => {
      expect(service.isConfigured()).toBe(false);
    });
  });
});
