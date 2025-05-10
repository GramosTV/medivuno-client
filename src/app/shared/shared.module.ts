import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// NavbarComponent is standalone, so it doesn't need to be declared or exported here.
// If you had other shared components, directives, or pipes, you would declare/export them.

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    // NavbarComponent // No need to import here if it's only used in AppComponent template
  ],
  exports: [
    // NavbarComponent // No need to export if standalone and imported directly where used
  ],
})
export class SharedModule {}
