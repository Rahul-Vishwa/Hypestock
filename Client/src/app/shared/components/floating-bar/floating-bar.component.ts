import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-floating-bar',
  imports: [RouterLink],
  templateUrl: './floating-bar.component.html',
  styleUrl: './floating-bar.component.css'
})
export class FloatingBarComponent {
  constructor(
    private router: Router
  ) {}

  openEventList(myEvents: boolean) {
    this.router.navigate(['/home'], {
      queryParams: {
        myEvents
      },
    });
  }
}
