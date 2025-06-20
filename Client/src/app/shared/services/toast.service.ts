import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
    id: number;
    message: string;
    class: 'info' | 'error';
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
    private idCounter = 0;
    private _toasts = new BehaviorSubject<Toast[]>([]);
    readonly toasts$ = this._toasts.asObservable();

    error(message: string) {
        this.addToast({ message, class: 'error' });
    }

    info(message: string) {
        this.addToast({ message, class: 'info' });
    }

    private addToast(toast: Omit<Toast, 'id'>) {
        const id = ++this.idCounter;
        const newToast: Toast = { id, ...toast };
        const current = this._toasts.value;
        this._toasts.next([...current, newToast]);
        setTimeout(() => this.remove(id), 3000);
    }

    remove(id: number) {
        const current = this._toasts.value;
        this._toasts.next(current.filter(t => t.id !== id));
    }
}