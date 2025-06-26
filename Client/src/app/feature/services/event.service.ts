import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Event, EventApiResponse, Pagination } from '../../shared/interface/interface';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  constructor(private http: HttpClient) { }

  getEvents(pagination: Pagination, filter: string, myEvents: boolean): Observable<EventApiResponse> {
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
    if (filter !== 'All') {
      params = params.set('filter', filter);
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

  deleteEvent(eventId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>('event', {
      params: {
        eventId
      }
    });
  }

  canEdit(eventId: string): Observable<{ canEdit: boolean }> {
    return this.http.get<{ canEdit: boolean }>('event/canEdit', {
      params: {
        eventId
      }
    })
  }
}
