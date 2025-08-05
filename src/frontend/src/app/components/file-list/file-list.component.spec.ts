import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { FileListComponent } from './file-list.component';
import { FileService, ProjectFile, FileUploadProgress } from '../../services/file.service';

describe('FileListComponent', () => {
  let component: FileListComponent;
  let fixture: ComponentFixture<FileListComponent>;
  let fileService: jasmine.SpyObj<FileService>;

  const mockFiles: ProjectFile[] = [
    {
      id: '1',
      filename: 'test.txt',
      size: 1024,
      type: 'text/plain',
      uploadDate: '2025-01-08T10:00:00Z',
      path: '/test.txt'
    },
    {
      id: '2',
      filename: 'readme.md',
      size: 2048,
      type: 'text/markdown',
      uploadDate: '2025-01-08T10:30:00Z',
      path: '/readme.md'
    }
  ];

  beforeEach(async () => {
    const fileServiceSpy = jasmine.createSpyObj('FileService', [
      'getProjectFiles',
      'uploadFiles',
      'deleteFile',
      'getFileContent',
      'downloadFile',
      'renameFile',
      'clearError',
      'clearUploadProgress',
      'isFileViewable',
      'getFileIcon',
      'formatFileSize'
    ], {
      files: jasmine.createSpy().and.returnValue(mockFiles),
      uploadProgress: jasmine.createSpy().and.returnValue([]),
      isLoading: jasmine.createSpy().and.returnValue(false),
      error: jasmine.createSpy().and.returnValue(null)
    });

    await TestBed.configureTestingModule({
      imports: [
        FileListComponent,
        HttpClientTestingModule,
        CommonModule,
        FormsModule
      ],
      providers: [
        { provide: FileService, useValue: fileServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FileListComponent);
    component = fixture.componentInstance;
    fileService = TestBed.inject(FileService) as jasmine.SpyObj<FileService>;
    
    // Set required input
    component.projectId = 'test-project-123';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load files on init when projectId is provided', fakeAsync(() => {
    fileService.getProjectFiles.and.returnValue(of(mockFiles));

    component.ngOnInit();
    tick();

    expect(fileService.getProjectFiles).toHaveBeenCalledWith('test-project-123');
  }));

  it('should not load files on init when projectId is not provided', fakeAsync(() => {
    component.projectId = '';
    fileService.getProjectFiles.and.returnValue(of(mockFiles));

    component.ngOnInit();
    tick();

    expect(fileService.getProjectFiles).not.toHaveBeenCalled();
  }));

  it('should handle file selection for upload', fakeAsync(() => {
    const mockFileList = {
      length: 2,
      item: (index: number) => index === 0 ? new File(['content1'], 'test1.txt') : new File(['content2'], 'test2.txt'),
      0: new File(['content1'], 'test1.txt'),
      1: new File(['content2'], 'test2.txt')
    } as FileList;

    const mockEvent = {
      target: { files: mockFileList, value: '' }
    } as any;

    const mockProgress: FileUploadProgress[] = [
      { filename: 'test1.txt', progress: 0, status: 'uploading' },
      { filename: 'test2.txt', progress: 0, status: 'uploading' }
    ];

    fileService.uploadFiles.and.returnValue(of(mockProgress));

    component.onFileSelected(mockEvent);
    tick();
    
    // Handle any remaining timers from upload completion
    tick(2000);

    expect(fileService.uploadFiles).toHaveBeenCalledWith('test-project-123', mockFileList);
    expect(mockEvent.target.value).toBe('');
  }));

  it('should handle file drop', fakeAsync(() => {
    const mockFiles = [
      new File(['content1'], 'dropped1.txt'),
      new File(['content2'], 'dropped2.txt')
    ];

    const mockDataTransfer = {
      files: {
        length: 2,
        item: (index: number) => mockFiles[index],
        0: mockFiles[0],
        1: mockFiles[1]
      }
    } as unknown as DataTransfer;

    const mockEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      dataTransfer: mockDataTransfer
    } as any;

    const mockProgress: FileUploadProgress[] = [
      { filename: 'dropped1.txt', progress: 0, status: 'uploading' },
      { filename: 'dropped2.txt', progress: 0, status: 'uploading' }
    ];

    fileService.uploadFiles.and.returnValue(of(mockProgress));

    component.onFileDrop(mockEvent);
    tick();
    
    // Handle any remaining timers from upload completion
    tick(2000);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(fileService.uploadFiles).toHaveBeenCalledWith('test-project-123', mockDataTransfer.files);
  }));

  it('should view file content for viewable files', fakeAsync(() => {
    const mockFile = mockFiles[0];
    const mockContent = 'File content here';

    fileService.isFileViewable.and.returnValue(true);
    fileService.getFileContent.and.returnValue(of(mockContent));

    component.viewFile(mockFile);
    tick();

    expect(fileService.isFileViewable).toHaveBeenCalledWith(mockFile.filename);
    expect(fileService.getFileContent).toHaveBeenCalledWith('test-project-123', mockFile.id);
    expect(component.selectedFile()).toBe(mockFile);
    expect(component.fileContent()).toBe(mockContent);
    expect(component.showFileViewer()).toBe(true);
  }));

  it('should download non-viewable files', fakeAsync(() => {
    const mockFile = mockFiles[0];
    const mockBlob = new Blob(['content']);

    fileService.isFileViewable.and.returnValue(false);
    fileService.downloadFile.and.returnValue(of(mockBlob));

    component.viewFile(mockFile);
    tick();

    expect(fileService.isFileViewable).toHaveBeenCalledWith(mockFile.filename);
    expect(fileService.downloadFile).toHaveBeenCalledWith('test-project-123', mockFile.id, mockFile.filename);
  }));

  it('should confirm and delete file', fakeAsync(() => {
    const mockFile = mockFiles[0];
    fileService.deleteFile.and.returnValue(of(undefined));

    // First confirm delete
    component.confirmDeleteFile(mockFile);
    expect(component.fileToDelete()).toBe(mockFile);
    expect(component.showDeleteConfirmation()).toBe(true);

    // Then actually delete
    component.deleteFile();
    tick();

    expect(fileService.deleteFile).toHaveBeenCalledWith('test-project-123', mockFile.id);
    expect(component.showDeleteConfirmation()).toBe(false);
    expect(component.fileToDelete()).toBeNull();
  }));

  it('should start and complete file rename', fakeAsync(() => {
    const mockFile = mockFiles[0];
    const newName = 'renamed-file.txt';
    const updatedFile = { ...mockFile, filename: newName };

    fileService.renameFile.and.returnValue(of(updatedFile));

    // Start rename
    component.startRenameFile(mockFile);
    expect(component.fileToRename()).toBe(mockFile);
    expect(component.newFileName()).toBe(mockFile.filename);
    expect(component.showRenameDialog()).toBe(true);

    // Update filename and rename
    component.newFileName.set(newName);
    component.renameFile();
    tick();

    expect(fileService.renameFile).toHaveBeenCalledWith('test-project-123', mockFile.id, newName);
    expect(component.showRenameDialog()).toBe(false);
    expect(component.fileToRename()).toBeNull();
    expect(component.newFileName()).toBe('');
  }));

  it('should cancel delete confirmation', () => {
    const mockFile = mockFiles[0];
    component.fileToDelete.set(mockFile);
    component.showDeleteConfirmation.set(true);

    component.cancelDelete();

    expect(component.showDeleteConfirmation()).toBe(false);
    expect(component.fileToDelete()).toBeNull();
  });

  it('should cancel rename dialog', () => {
    const mockFile = mockFiles[0];
    component.fileToRename.set(mockFile);
    component.newFileName.set('new-name');
    component.showRenameDialog.set(true);

    component.cancelRename();

    expect(component.showRenameDialog()).toBe(false);
    expect(component.fileToRename()).toBeNull();
    expect(component.newFileName()).toBe('');
  });

  it('should close file viewer', () => {
    const mockFile = mockFiles[0];
    component.selectedFile.set(mockFile);
    component.fileContent.set('content');
    component.showFileViewer.set(true);

    component.closeFileViewer();

    expect(component.showFileViewer()).toBe(false);
    expect(component.selectedFile()).toBeNull();
    expect(component.fileContent()).toBe('');
  });

  it('should toggle upload area', () => {
    expect(component.showUploadArea()).toBe(false);

    component.toggleUploadArea();
    expect(component.showUploadArea()).toBe(true);

    component.toggleUploadArea();
    expect(component.showUploadArea()).toBe(false);
  });

  it('should clear error', () => {
    component.clearError();
    expect(fileService.clearError).toHaveBeenCalled();
  });

  it('should delegate utility methods to FileService', () => {
    const filename = 'test.txt';
    const bytes = 1024;

    fileService.getFileIcon.and.returnValue('description');
    fileService.formatFileSize.and.returnValue('1 KB');
    fileService.isFileViewable.and.returnValue(true);

    expect(component.getFileIcon(filename)).toBe('description');
    expect(component.formatFileSize(bytes)).toBe('1 KB');
    expect(component.isFileViewable(filename)).toBe(true);

    expect(fileService.getFileIcon).toHaveBeenCalledWith(filename);
    expect(fileService.formatFileSize).toHaveBeenCalledWith(bytes);
    expect(fileService.isFileViewable).toHaveBeenCalledWith(filename);
  });

  it('should format date correctly', () => {
    const dateString = '2025-01-08T10:00:00Z';
    const formattedDate = component.formatDate(dateString);
    
    // Just check that it returns a string (exact format may vary by locale)
    expect(typeof formattedDate).toBe('string');
    expect(formattedDate.length).toBeGreaterThan(0);
  });

  it('should handle upload errors', fakeAsync(() => {
    const mockFileList = {
      length: 1,
      item: () => new File(['content'], 'test.txt'),
      0: new File(['content'], 'test.txt')
    } as FileList;

    const mockEvent = {
      target: { files: mockFileList, value: '' }
    } as any;

    fileService.uploadFiles.and.returnValue(throwError(() => 'Upload failed'));

    spyOn(console, 'error');

    component.onFileSelected(mockEvent);
    tick();

    expect(console.error).toHaveBeenCalledWith('Upload failed:', 'Upload failed');
  }));

  it('should handle load files error', fakeAsync(() => {
    fileService.getProjectFiles.and.returnValue(throwError(() => 'Failed to load files'));

    spyOn(console, 'error');

    component.loadFiles();
    tick();

    expect(console.error).toHaveBeenCalledWith('Failed to load files:', 'Failed to load files');
  }));

  it('should handle file content loading error', fakeAsync(() => {
    const mockFile = mockFiles[0];

    fileService.isFileViewable.and.returnValue(true);
    fileService.getFileContent.and.returnValue(throwError(() => 'Failed to load content'));

    spyOn(console, 'error');

    component.viewFile(mockFile);
    tick();

    expect(console.error).toHaveBeenCalledWith('Failed to load file content:', 'Failed to load content');
  }));
});
