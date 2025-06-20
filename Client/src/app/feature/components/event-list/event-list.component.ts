import { booleanAttribute, Component, OnInit, signal } from '@angular/core';
import { EventList, Pagination } from '../../../shared/interface/interface';
import { EventService } from '../../services/event.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import convertTo12hFormat from '../../../shared/utility/time';
import { debounceTime, Subscription } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-event-list',
  imports: [
    TitleCasePipe,
    ReactiveFormsModule
  ],
  templateUrl: './event-list.component.html',
  styleUrl: './event-list.component.css',
})
export class EventListComponent implements OnInit {
  private subscription = new Subscription();
  myEvents = signal(false);
  eventList = signal<EventList>([]);
  totalRows = signal<number>(0);
  pagination = signal<Pagination>({
    page: 1,
    pageSize: 10,
    searchTerm: null
  });
  searchInput = new FormControl('');

  constructor(
    private event: EventService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.myEvents.set(
        booleanAttribute(params.get('myEvents'))
      );
      this.getEvents();
    });
    this.searchEvent();
  }
  
  private getEvents() {
    this.subscription.add(
      this.event.getEvents(
        this.pagination(), 
        this.myEvents()
      )
      .subscribe(data => {
        this.eventList.set(data.events);
        this.totalRows.set(data.totalRows);
      })
    );
  }

  searchEvent() {
    this.subscription.add(
      this.searchInput.valueChanges
      .pipe(
        debounceTime(200)
      )
      .subscribe(searchTerm => {
        this.pagination.update(prev => ({ ...prev, searchTerm }));
        this.getEvents();
      })
    );
  }

  totalPages() {
    return Math.ceil(this.totalRows() / this.pagination().pageSize);
  }

  openEvent(id: string) {
    if (this.myEvents()) {
      this.router.navigate(['/home/manageEvent'], { 
        queryParams: { 
          edit: id 
        } 
      });
    }
    else {
      this.router.navigate(['/home/trade'], {
        queryParams: {
          id
        }
      });
    }
  }

  onPageDecrease() {
    if (this.pagination().page > 1){
      this.pagination.update(prev => ({ ...prev, page: prev.page - 1 }));
    }
    this.getEvents();
  }

  onPageIncrease() {
    if (this.pagination().page < this.totalPages()){
      this.pagination.update(prev => ({ ...prev, page: prev.page + 1 }));
    }
    this.getEvents();
  }

  convertTo12hFormat(time: string) {
    return convertTo12hFormat(time);
  }
}
