import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.darkModeSubject.asObservable();

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      this.setTheme(shouldUseDark);
    }
  }

  toggleTheme(): void {
    const currentTheme = this.darkModeSubject.value;
    this.setTheme(!currentTheme);
  }

  setTheme(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;

      if (isDark) {
        html.classList.add('dark');
        localStorage?.setItem('theme', 'dark');
      } else {
        html.classList.remove('dark');
        localStorage?.setItem('theme', 'light');
      }
    }

    this.darkModeSubject.next(isDark);
  }

  get isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
}
