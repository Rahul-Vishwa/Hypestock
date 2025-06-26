import { booleanAttribute, Component, OnInit, signal } from '@angular/core';
import { EventList, Pagination, Status } from '../../../shared/interface/interface';
import { EventService } from '../../services/event.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass, TitleCasePipe } from '@angular/common';
import convertTo12hFormat from '../../../shared/utility/time';
import { debounceTime, Subscription } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { DropdownComponent } from "../../../shared/components/dropdown/dropdown.component";

@Component({
  selector: 'app-event-list',
  imports: [
    TitleCasePipe,
    ReactiveFormsModule,
    NgClass,
    DropdownComponent
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
  filter = new FormControl('All');
  showDeleteIcon = signal<string | null>(null);
  filters = [
    { label: 'All', value: 'All' },
    { label: Status.upcoming, value: Status.upcoming },
    { label: Status.ipoPhase, value: Status.ipoPhase },
    { label: Status.started, value: Status.started },
    { label: Status.ended, value: Status.ended },
  ];

  constructor(
    private event: EventService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
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
        this.filter.value!, 
        this.myEvents()
      )
      .subscribe(data => {
        this.eventList.set(data.events);
        this.totalRows.set(data.totalRows);
      })
    );
  }

  onFilterChange() {
    this.pagination.update(prev => ({ ...prev, page: 1 }));
    this.getEvents();
  }

  searchEvent() {
    this.subscription.add(
      this.searchInput.valueChanges
      .pipe(
        debounceTime(200)
      )
      .subscribe(searchTerm => {
        this.pagination.set({ 
          page: 1,
          pageSize: 10, 
          searchTerm 
        });
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

  deleteEvent(id: string) {
    if (this.myEvents()) {
      this.subscription.add(
        this.event.deleteEvent(id)
        .subscribe(({ message }) => {
          this.toast.info(message);
          this.getEvents();
        })
      );
    }
  }

  onPageDecrease() {
    if (this.pagination().page > 1){
      this.pagination.update(prev => ({ ...prev, page: prev.page - 1 }));
    }
    this.getEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onPageIncrease() {
    if (this.pagination().page < this.totalPages()){
      this.pagination.update(prev => ({ ...prev, page: prev.page + 1 }));
    }
    this.getEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  convertTo12hFormat(time: string) {
    return convertTo12hFormat(time);
  }
}
