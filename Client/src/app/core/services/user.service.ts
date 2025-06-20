import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '@auth0/auth0-angular';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http:HttpClient) { }

  saveUser(user: User): Observable<void> {
    return this.http.post<void>('user', user);
  }

  assignRole(role: string): Observable<void>{
    return this.http.post<void>('user/assignRole', { role });
  }

  getRole(): Observable<{ role: string }>{
    return this.http.get<{ role: string }>('user/getRole');
  }
}
