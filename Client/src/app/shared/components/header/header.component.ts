import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '@auth0/auth0-angular';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  user = signal<User | null>(null);
  isLoggedIn = signal<boolean>(false);

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const segments = this.router.url.split('/').filter(Boolean);
    const lastSegment = segments.at(-1);
  
    if (lastSegment) {
      this.isLoggedIn.set(true);
    }
    this.auth.user$.subscribe(user => {
      if (user) {
        this.user.set(user);
      }
    });
  }

  login() {
    this.auth.loginWithRedirect();
  }

  logout() {
    this.auth.logout();
  }
}
