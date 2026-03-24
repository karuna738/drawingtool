import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PintComponent } from './paint/pint.component';
import { FigmaComponent } from './figma/figma.component';

const routes: Routes = [
  {
    path: '', redirectTo:'paint', pathMatch: 'full'
  },
  {
    path: 'paint',
    component: PintComponent,
  },
  {
    path:'figma',
    component: FigmaComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
