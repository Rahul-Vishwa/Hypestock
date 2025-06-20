import { Routes } from "@angular/router";

export const home: Routes = [
    {
        path: '',
        loadComponent: () => import('../feature/components/event-list/event-list.component').then(c => c.EventListComponent)
    },
    {
        path: 'manageEvent',
        loadComponent: () => import('../feature/components/manage-event/manage-event.component').then(c => c.ManageEventComponent)
    },
    {
        path: 'trade',
        loadComponent: () => import('../feature/components/trading/trade/trade.component').then(c => c.TradeComponent)
    },
    {
        path: 'balance',
        loadComponent: () => import('../feature/components/manage-balance/manage-balance.component').then(c => c.ManageBalanceComponent)
    },
];