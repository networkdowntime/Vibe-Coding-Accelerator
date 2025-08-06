import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { FileListComponent } from './file-list.component';
import { FileService, FileItem } from '../../services/file.service';
import { FileModalComponent } from '../file-modal/file-modal.component';

describe('FileListComponent', () => {
  let component: FileListComponent;
  let fixture: ComponentFixture<FileListComponent>;
  let fileService: jasmine.SpyObj<FileService>;

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
    },
    {
      name: 'config.yml',
      size: 512,
      type: '.yml',
      createdAt: '2023-01-03T00:00:00Z',
      modifiedAt: '2023-01-03T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    const fileServiceSpy = jasmine.createSpyObj('FileService', [
      'listFiles',
      'uploadFile',
      'renameFile',
      'deleteFile',
      'getFileUrl',
      'getFileIconClass',
      'formatFileSize'
    ]);

    await TestBed.configureTestingModule({
      imports: [FileListComponent, FormsModule, HttpClientTestingModule, FileModalComponent],
      providers: [
        { provide: FileService, useValue: fileServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FileListComponent);
    component = fixture.componentInstance;
    fileService = TestBed.inject(FileService) as jasmine.SpyObj<FileService>;

    // Setup default spy returns
    fileService.listFiles.and.returnValue(of(mockFiles));
    fileService.getFileIconClass.and.returnValue('file-text');
    fileService.formatFileSize.and.returnValue('1 KB');
    fileService.getFileUrl.and.returnValue('http://localhost:3001/api/projects/test/files/test.txt');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load files on init when projectName is provided', () => {
    component.projectName = 'testproject';
    component.ngOnInit();

    expect(fileService.listFiles).toHaveBeenCalledWith('testproject');
    expect(component.files).toEqual(mockFiles);
    // Files should be sorted by date descending (newest first) by default
    const expectedSortedFiles = [
      mockFiles[2], // config.yml (2023-01-03, newest)
      mockFiles[1], // readme.md (2023-01-02, middle)
      mockFiles[0]  // test.txt (2023-01-01, oldest)
    ];
    expect(component.filteredFiles).toEqual(expectedSortedFiles);
  });

  it('should not load files on init when projectName is empty', () => {
    component.projectName = '';
    component.ngOnInit();

    expect(fileService.listFiles).not.toHaveBeenCalled();
  });

  it('should handle file loading error', () => {
    const errorMessage = 'Failed to load files';
    fileService.listFiles.and.returnValue(throwError(() => new Error(errorMessage)));
    spyOn(component.error, 'emit');

    component.projectName = 'testproject';
    component.loadFiles();

    expect(component.error.emit).toHaveBeenCalledWith(`Failed to load files: ${errorMessage}`);
    expect(component.isLoading).toBe(false);
  });

  describe('search and filter', () => {
    beforeEach(() => {
      component.files = mockFiles;
      component.applyFiltersAndSort();
    });

    it('should filter files by search term', () => {
      component.searchTerm = 'readme';
      component.applyFiltersAndSort();

      expect(component.filteredFiles.length).toBe(1);
      expect(component.filteredFiles[0].name).toBe('readme.md');
    });

    it('should be case insensitive when filtering', () => {
      component.searchTerm = 'README';
      component.applyFiltersAndSort();

      expect(component.filteredFiles.length).toBe(1);
      expect(component.filteredFiles[0].name).toBe('readme.md');
    });

    it('should show all files when search term is empty', () => {
      component.searchTerm = '';
      component.applyFiltersAndSort();

      expect(component.filteredFiles.length).toBe(3);
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      component.files = mockFiles;
    });

    it('should sort by name', () => {
      component.onSortChange('name');
      
      expect(component.sortBy).toBe('name');
      expect(component.sortDirection).toBe('asc');
      expect(component.filteredFiles[0].name).toBe('config.yml');
      expect(component.filteredFiles[2].name).toBe('test.txt');
    });

    it('should toggle sort direction when clicking same column', () => {
      component.sortBy = 'name';
      component.sortDirection = 'asc';
      
      component.onSortChange('name');
      
      expect(component.sortDirection).toBe('desc');
    });

    it('should sort by size', () => {
      component.onSortChange('size');
      
      expect(component.sortBy).toBe('size');
      expect(component.filteredFiles[0].size).toBe(512); // config.yml
      expect(component.filteredFiles[2].size).toBe(2048); // readme.md
    });

    it('should sort by type', () => {
      component.onSortChange('type');
      
      expect(component.sortBy).toBe('type');
      expect(component.filteredFiles[0].type).toBe('.md');
      expect(component.filteredFiles[2].type).toBe('.yml');
    });
  });

  describe('modal operations', () => {
    it('should open upload modal', () => {
      component.openUploadModal();
      expect(component.showUploadModal).toBe(true);
    });

    it('should close upload modal', () => {
      component.showUploadModal = true;
      component.onUploadModalClose();
      expect(component.showUploadModal).toBe(false);
    });

    it('should handle file upload success', () => {
      spyOn(component, 'loadFiles');
      spyOn(component.fileUploaded, 'emit');
      
      const uploadedFile = mockFiles[0];
      component.onFileUploaded(uploadedFile);
      
      expect(component.showUploadModal).toBe(false);
      expect(component.loadFiles).toHaveBeenCalled();
      expect(component.fileUploaded.emit).toHaveBeenCalledWith(uploadedFile);
    });

    it('should open rename modal with selected file', () => {
      const file = mockFiles[0];
      component.openRenameModal(file);
      
      expect(component.selectedFile).toBe(file);
      expect(component.showRenameModal).toBe(true);
    });

    it('should handle file rename success', () => {
      spyOn(component, 'loadFiles');
      spyOn(component.fileUpdated, 'emit');
      
      component.onFileRenamed();
      
      expect(component.showRenameModal).toBe(false);
      expect(component.selectedFile).toBe(null);
      expect(component.loadFiles).toHaveBeenCalled();
      expect(component.fileUpdated.emit).toHaveBeenCalled();
    });

    it('should open delete modal with selected file', () => {
      const file = mockFiles[0];
      component.openDeleteModal(file);
      
      expect(component.selectedFile).toBe(file);
      expect(component.showDeleteModal).toBe(true);
    });

    it('should handle file delete success', () => {
      spyOn(component, 'loadFiles');
      spyOn(component.fileUpdated, 'emit');
      
      component.onFileDeleted();
      
      expect(component.showDeleteModal).toBe(false);
      expect(component.selectedFile).toBe(null);
      expect(component.loadFiles).toHaveBeenCalled();
      expect(component.fileUpdated.emit).toHaveBeenCalled();
    });

    it('should handle modal errors', () => {
      spyOn(component.error, 'emit');
      
      const errorMessage = 'Upload failed';
      component.onModalError(errorMessage);
      
      expect(component.error.emit).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('file operations', () => {
    beforeEach(() => {
      component.projectName = 'testproject';
    });

    it('should open file in new window', () => {
      spyOn(window, 'open');
      const file = mockFiles[0];
      
      component.openFile(file);
      
      expect(fileService.getFileUrl).toHaveBeenCalledWith('testproject', 'test.txt');
      expect(window.open).toHaveBeenCalledWith('http://localhost:3001/api/projects/test/files/test.txt', '_blank');
    });
  });

  describe('utility methods', () => {
    it('should get file icon class from service', () => {
      const result = component.getFileIconClass('test.txt');
      
      expect(fileService.getFileIconClass).toHaveBeenCalledWith('test.txt');
      expect(result).toBe('file-text');
    });

    it('should format file size from service', () => {
      const result = component.formatFileSize(1024);
      
      expect(fileService.formatFileSize).toHaveBeenCalledWith(1024);
      expect(result).toBe('1 KB');
    });

    it('should format date correctly', () => {
      const dateString = '2023-01-01T00:00:00Z';
      const result = component.formatDate(dateString);
      
      // Test should be flexible with timezone differences
      // The date should contain some form of date and time formatting
      expect(result).toMatch(/\d+\/\d+\/\d+/); // Contains date in MM/DD/YYYY or similar format
      expect(result).toMatch(/\d+:\d+ (AM|PM)/); // Contains time in HH:MM AM/PM format
    });

    it('should return correct sort arrow class', () => {
      component.sortBy = 'name';
      component.sortDirection = 'asc';
      
      expect(component.getSortArrowClass('name')).toBe('sort-asc');
      expect(component.getSortArrowClass('date')).toBe('');
      
      component.sortDirection = 'desc';
      expect(component.getSortArrowClass('name')).toBe('sort-desc');
    });
  });

  describe('component lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
