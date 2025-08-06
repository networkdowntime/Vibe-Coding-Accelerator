import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectListComponent } from '../project-list/project-list.component';

@Component({
  selector: 'app-main-ui',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjectListComponent],
  templateUrl: './main-ui.component.html',
  styleUrl: './main-ui.component.scss'
})
export class MainUiComponent {
  title = 'Vibe Coding Accelerator';
  
  constructor() {}
}
