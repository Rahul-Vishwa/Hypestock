import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Event, EventApiResponse, Pagination } from '../../shared/interface/interface';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  constructor(private http: HttpClient) { }

  getEvents(pagination: Pagination, myEvents: boolean): Observable<EventApiResponse> {
    let params = new HttpParams({
      fromObject: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        myEvents
      }
    });

    if (pagination.searchTerm) {
      params = params.set('searchTerm', pagination.searchTerm);
    }
    return this.http.get<EventApiResponse>('event/all', {
      params
    });
  }

  getEvent(id: string): Observable<{ event: Event }> {
    return this.http.get<{ event: Event }>('event', {
      params: {
        id
      }
    });
  }

  createEvent(data: Event): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('event', data);
  }
  
  editEvent(data: Event): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>('event', data);
  }

  isRunning(eventId: string): Observable<{ isRunning: boolean }> {
    return this.http.get<{ isRunning: boolean }>('event/isRunning', {
      params: {
        eventId
      }
    })
  }
}
