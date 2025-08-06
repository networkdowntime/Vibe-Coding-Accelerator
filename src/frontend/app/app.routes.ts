import { Routes } from '@angular/router';
import { MainUiComponent } from './components/main-ui/main-ui.component';
import { ProjectViewComponent } from './components/project-view/project-view.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: '', component: MainUiComponent },
  { path: 'project/:id', component: ProjectViewComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' } // Wildcard route for 404s
];
