import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmployeeDashboardComponent } from './pages/employee-dashboard/employee-dashboard.component';
import { MyRequestsComponent } from './pages/my-requests/my-requests.component';
import { RequestDetailComponent } from './pages/request-detail/request-detail.component';
import { EmployeeRequestComponent } from './requests/employee-request.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: EmployeeDashboardComponent },
  { path: 'requests/new', redirectTo: 'requests', pathMatch: 'full' },
  { path: 'requests', component: EmployeeRequestComponent },
  { path: 'requests/history', component: MyRequestsComponent },
  { path: 'requests/:id', component: RequestDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EmployeeRoutingModule {}
