import { FormControl } from "@angular/forms";
import { Time } from "lightweight-charts";

export interface Pagination {
    page: number;
    pageSize: number;
    searchTerm: string | null;
};

export interface Event {
    id: string;
    title: string;
    description: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
}

export type EventList = Array<Event>;
export type EventApiResponse = { events: Array<Event>, totalRows: number };

export interface EventForm {
    id: FormControl<string | null>;
    title: FormControl<string | null>;
    description: FormControl<string | null>;
    category: FormControl<string | null>;
    date: FormControl<string | null>;
    startTime: FormControl<string | null>;
    endTime: FormControl<string | null>;
}

export type OrderBook = {
    [price: number]: {
        quantity: number,
        side: 'bid' | 'ask'
    }
};

export type OrderBookArr = [string, {
    quantity: number;
    side: "bid" | "ask";
}][];

export interface DataPoint {
    time: Time;
    value: number;
}