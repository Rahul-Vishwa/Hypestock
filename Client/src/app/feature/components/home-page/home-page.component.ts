import { Component } from '@angular/core';
import { HeaderComponent } from "../../../shared/components/header/header.component";
import { RouterOutlet } from '@angular/router';
import { FloatingBarComponent } from "../../../shared/components/floating-bar/floating-bar.component";

@Component({
  selector: 'app-home-page',
  imports: [HeaderComponent, RouterOutlet, FloatingBarComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {

}
