import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { ReactiveFormsModule } from "@angular/forms";

import { ProjectModalComponent, ProjectModalData, ProjectModalResult } from "./project-modal.component";
import { Project } from "../../services/project.service";

describe("ProjectModalComponent", () => {
  let component: ProjectModalComponent;
  let fixture: ComponentFixture<ProjectModalComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ProjectModalComponent>>;

  const mockProject: Project = {
    id: "1",
    name: "Test Project",
    description: "Test Description",
    status: "active",
    createdAt: "2025-08-04T10:00:00Z",
    updatedAt: "2025-08-04T10:00:00Z"
  };

  beforeEach(() => {
    mockDialogRef = jasmine.createSpyObj("MatDialogRef", ["close"]);
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
    TestBed.resetTestingModule();
  });

  function createComponent(dialogData: ProjectModalData) {
    TestBed.configureTestingModule({
      imports: [
        ProjectModalComponent,
        NoopAnimationsModule,
        ReactiveFormsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ]
    });

    fixture = TestBed.createComponent(ProjectModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it("should create", () => {
    const createData: ProjectModalData = {
      mode: "create",
      title: "Create New Project"
    };
    createComponent(createData);
    expect(component).toBeTruthy();
  });
});
