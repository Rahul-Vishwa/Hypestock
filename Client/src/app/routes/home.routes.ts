import { Routes } from "@angular/router";

export const home: Routes = [
    {
        path: '',
        loadComponent: () => import('../feature/components/event-list/event-list.component').then(c => c.EventListComponent)
    },
    {
        path: 'manageEvent',
        loadComponent: () => import('../feature/components/balance/manage-event/manage-event.component').then(c => c.ManageEventComponent)
    },
    {
        path: 'trade',
        loadComponent: () => import('../feature/components/trading/trade/trade.component').then(c => c.TradeComponent)
    },
    {
        path: 'orders',
        loadComponent: () => import('../feature/components/orders/orders.component').then(c => c.OrdersComponent)
    },
    {
        path: 'holdings',
        loadComponent: () => import('../feature/components/holdings/holdings.component').then(c => c.HoldingsComponent)
    },
    {
        path: 'balance',
        loadComponent: () => import('../feature/components/balance/manage-balance/manage-balance.component').then(c => c.ManageBalanceComponent)
    },
];