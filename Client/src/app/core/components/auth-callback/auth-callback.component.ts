import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '@auth0/auth0-angular';
import { Subscription, concatMap, of } from 'rxjs';
import { UserService } from '../../services/user.service';
import { LoaderService } from '../../../shared/services/loader.service';

@Component({
  selector: 'app-auth-callback',
  imports: [],
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.css'
})
export class AuthCallbackComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  constructor(
    private auth: AuthService,
    private router: Router,
    private userService:UserService,
    private loader: LoaderService
  ) {}

  ngOnInit(){
    this.loader.show();
    this.subscriptions.add(
      this.auth.isLoading$.subscribe(loading=>{
        if (!loading){
          this.auth.isAuthenticated$
          .pipe(
            concatMap(isAuthenticated=>{
              if (isAuthenticated){
                return this.auth.user$;
              }
              return of(null);
            })
          )
          .subscribe(user=>{
            if (user){
              this.saveUser(user);
              const role = localStorage.getItem('selectedRole');
              if (role){
                this.assignUser(role);
              }
              this.router.navigate(['/home']);
            }
            else{
              this.router.navigate(['/']);
            }
            this.loader.hide();
          })
        }
      })
    );
  }

  private saveUser(user:User){
    this.subscriptions.add(
      this.userService.saveUser({
        email: user.email,
        nickName: user.given_name,
        name: user.name,
      })
      .subscribe(response=>{
        console.log(response);
      })
    );
  }

  private assignUser(role: string){
    let roleId;
    if (role === 'admin'){
      roleId = 'rol_knbCHBd52GLL7q7X';
    }
    else {
      roleId = 'rol_5kQOwWJdoSgamNXw';
    }

    if (roleId){
      this.userService.assignRole(roleId)
        .subscribe(()=>{
          console.log('Role Assigned.');
        })
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
