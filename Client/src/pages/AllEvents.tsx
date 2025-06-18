import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import convertTo12hFormat from "../utility/utility";

export interface Event {
    id: string;
    title: string;
    description: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
}

type eventApiResponse = { events: Array<Event>, totalRows: number };
export type eventDetails = Array<Event>;

interface Pagination {
  page: number,
  pageSize: number,
  searchTerm: string | null
};

export default function AllEvents() {
  const [events, setEvents] = useState<eventDetails>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    searchTerm: null
  });
  const [totalRows, setTotalRows] = useState<number>(0); 
  const navigate = useNavigate();

  useEffect(() => {
    api.get<eventApiResponse>('/event/all', {
      params: pagination
    })
      .then(({ data })=>{
        setEvents(data.events);
        setTotalRows(data.totalRows);
      })
      .catch(error => {
        console.log(error);
      }); 

  }, [pagination]);

  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    const searchTerm = e.target.value;
    setPagination({ page: 1, pageSize: 10 , searchTerm});
  }

  function handleeventClick(event: Event) {
    navigate(`trade/${event.id}`);
  }

  function handleLeftButtonClick() {
    if (pagination.page > 1){
      setPagination({ ...pagination, page: pagination.page - 1 });
    }
  }

  function handleRightButtonClick() {
    if (pagination.page < Math.ceil(totalRows / pagination.pageSize)){
      setPagination({ ...pagination, page: pagination.page + 1 });
    }
  }

  return ( 
    <div className="">

      <div className="mb-10 grid grid-cols-5">
        <div className="col-span-4">
          <input 
            type="text" 
            placeholder="Search" 
            className="input w-full" 
            onChange={handleSearchInput}
          />
        </div>
        <div className="w-full flex items-center gap-5 justify-end">
          <div onClick={handleLeftButtonClick}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="m3.86 8.753 5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"/>
            </svg>
          </div>
          <div>
            Page {pagination.page} of {Math.ceil(totalRows / pagination.pageSize)}
          </div>
          <div onClick={handleRightButtonClick}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {
          events.map(event=>{
            return <div key={event.id} onClick={() => handleeventClick(event)} className="p-8 px-8 bg-secondary rounded-sm flex justify-between">
              <div className="flex flex-col gap-3">
                <div className="font-bold text-xl">
                    {event.title} <span className="ml-2 bg-blue-600 px-1 py-[2px] rounded-sm text-[10px]">{event.category.toUpperCase()}</span>
                </div>
                <div>
                  {event.description}
                </div>
              </div>
              <div className="flex flex-col gap-3 items-end">
                <div className="font-bold">
                  {event.date}
                </div>
                <div>
                  {convertTo12hFormat(event.startTime)} - {convertTo12hFormat(event.endTime)}
                </div>
              </div>
            </div>
          })
        }
      </div>
    </div>
  );
}