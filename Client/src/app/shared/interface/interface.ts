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
    ipo: string;
    status: string;
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
    ipo: FormControl<string | null>;
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

export interface Payment {
    id: string;
    amount: number;
    status: string;
    createdBy: string; //id
    createdAt: string;
}

export interface Order {
    eventId: string;
    price: number;
    quantity: number; 
    side: 'bid' | 'ask';
}

export enum Status {
    upcoming = 'Upcoming',
    ipoPhase = 'IPO Phase',
    started = 'Started',
    ended = 'Ended',
};

export interface Balance {
    balance: number;
    lockedBalance: number;
}

export interface OrderDetails {
    id: string;
    eventId: string;
    price: number;
    quantity: number;
    remainingQty: number;
    side: 'bid' | 'ask';
    createdBy: string;
    createdAt: string;

    event: {
        title: string
    }
}

export interface Holding {
    eventId: string;
    eventTitle: string;
    quantity: number;
    lockedQty?: number;
    event?: {
        title: string
    }
}