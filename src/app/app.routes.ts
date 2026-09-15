import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BuilderComponent } from './pages/builder/builder.component';
import { PrintComponent } from './pages/print/print.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'builder', component: BuilderComponent },
  { path: 'print', component: PrintComponent },
  { path: '**', redirectTo: '' },
];
