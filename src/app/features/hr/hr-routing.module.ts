import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { InboxComponent } from './pages/inbox/inbox.component';
import { ReportGeneratorComponent } from './pages/report-generator/report-generator.component';
import { ValidationDetailComponent } from './pages/validation-detail/validation-detail.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'inbox', component: InboxComponent },
  { path: 'validations/:id', component: ValidationDetailComponent },
  { path: 'reports', component: ReportGeneratorComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HrRoutingModule {}
