import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ToastService } from "../../services/toast.service";
import { DomSanitizer } from "@angular/platform-browser";
import { AsyncPipe, NgClass } from "@angular/common";

@Component({
    selector: 'app-toast',
    imports: [NgClass, AsyncPipe],
    template: `
        <div class="fixed top-0 right-0 z-40 m-3">
            @for (toast of toastService.toasts$ | async; track trackById(toast)) {
                <div  [ngClass]="{ 'bg-blue-600': toast.class === 'info', 'bg-red-500': toast.class === 'error' }" class="text-[14px] w-96 flex gap-5 justify-between items-center m-2 px-6 py-5 lighter-font-color rounded-sm shadow-md">  
                    <div [innerHTML]="sanitizeHtml(toast.message)">    
                    </div> 
                    <div class="lighter-font-color" (click)="remove(toast.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                        </svg>
                    </div>
                </div>  
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
    constructor(
        public toastService: ToastService,
        private sanitizer: DomSanitizer
    ) { }  

    sanitizeHtml(toast:string){
        return this.sanitizer.bypassSecurityTrustHtml(toast);
    }

    remove(id:number){
        this.toastService.remove(id);
    }

    trackById(toast: { id: number }) {
        return toast.id;
    }
}