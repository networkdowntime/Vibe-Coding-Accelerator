import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/projects',
    pathMatch: 'full'
  },
  {
    path: 'projects',
    loadComponent: () => import('./components/main-ui/main-ui.component').then(m => m.MainUiComponent)
  },
  {
    path: 'project/new',
    loadComponent: () => import('./components/project-view/project-view.component').then(m => m.ProjectViewComponent),
    data: { mode: 'edit' }
  },
  {
    path: 'project/:id',
    loadComponent: () => import('./components/project-view/project-view.component').then(m => m.ProjectViewComponent)
  },
  {
    path: 'project/:id/edit',
    loadComponent: () => import('./components/project-view/project-view.component').then(m => m.ProjectViewComponent),
    data: { mode: 'edit' }
  },
  {
    path: '**',
    redirectTo: '/projects'
  }
];
