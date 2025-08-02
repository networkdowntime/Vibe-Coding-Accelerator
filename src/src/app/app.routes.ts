
import { Routes } from '@angular/router';
import { MainUiComponent } from './components/main-ui.component';
import { ProjectViewEditComponent } from './components/project-view-edit.component';

export const routes: Routes = [
  {
    path: '',
    component: MainUiComponent,
    pathMatch: 'full',
  },
  {
    path: 'project/:id',
    component: ProjectViewEditComponent,
  },
];
