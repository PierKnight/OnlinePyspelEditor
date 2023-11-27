import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApptoastService {

  constructor() { }


  toasts: ToastInfo[] = [];

  show(info: ToastInfo) {
    this.toasts.push(info);
  }

  success(message: string,header : string = "Success",)
  {
    this.toasts.push({body: message,header: header,type: "success"})
  }

  error(message: string,header : string = "Error",)
  {
    this.toasts.push({body: message,header: header,type: "error"})
  }

  remove(toast: ToastInfo) {
    this.toasts = this.toasts.filter(t => t != toast);
  }
}


export interface ToastInfo {
  header: string;
  body: string;
  delay?: number;
  type: "error" | "warning" | "success"
}
