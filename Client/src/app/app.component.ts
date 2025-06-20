import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from "./shared/components/loader/loader.component";
import { ToastComponent } from "./shared/components/toast/toast.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoaderComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Hypestock';
}