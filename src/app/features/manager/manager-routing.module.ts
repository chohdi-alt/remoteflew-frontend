import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InboxComponent } from './pages/inbox/inbox.component';
import { ValidationDetailComponent } from './pages/validation-detail/validation-detail.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inbox' },
  { path: 'inbox', component: InboxComponent },
  { path: 'validations/:id', component: ValidationDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule {}
