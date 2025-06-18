import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Event } from "./AllEvents";
import convertTo12hFormat from "../utility/utility";
import api from "../api/axios";
import { connect, disconnect, isConnected } from "../lib/socket";
import OrderBook from "./OrderBook";
import LiveChart from "./LiveChart";
import PlaceOrder from "./PlaceOrder";

export default function Trade() {
    const { id } = useParams();
    const [event, setEvent] = useState<Event | null>(null);

    useEffect(() => {
        api.get<{event: Event | null}>('/event', {
            params:{
                id
            }
        })
        .then(({data}) => {
            setEvent(data.event);
            if (data.event){
                connectSocket(data.event.id);
            }
        })
        .catch(error => {
            console.log(error);
        });

        return () => {
            if (isConnected()){
                disconnect();
            }
        }
    }, []);

    function connectSocket(eventId: string) {
        connect(eventId);
    }

    return (
        <div className="grid grid-cols-1 gap-5">
            {
                event && 
                <>
                    <div className="p-8 px-8 bg-secondary rounded-sm flex justify-between">
                        <div className="flex flex-col gap-3">
                            <div className="font-bold text-xl">
                                {event?.title} <span className="ml-2 bg-blue-600 px-1 py-[2px] rounded-sm text-[10px]">{event?.category.toUpperCase()}</span>
                            </div>
                            <div>
                                {event?.description}
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 items-end">
                            <div className="font-bold">
                                {event?.date}
                            </div>
                            <div>
                                {convertTo12hFormat(event?.startTime!)} - {convertTo12hFormat(event?.endTime!)}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-12 gap-10">
                        <div className="col-span-4">
                            <PlaceOrder eventId={event?.id}></PlaceOrder>
                            <OrderBook></OrderBook>
                        </div>
                        <div className="col-span-8">
                            <LiveChart eventId={event?.id}/>
                        </div>
                    </div>
                </>
            }
      </div>
    );
}