import { Component, inject, OnInit } from '@angular/core';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader',
  imports: [],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css'
})
export class LoaderComponent implements OnInit {
  private loaderService = inject(LoaderService);
  show:boolean = false;

  ngOnInit(): void {
    this.loaderService.loading$.subscribe(isLoading=>{
      this.show = isLoading;
    });
  }
}
