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
    console.log('🔄 Toggling theme from:', currentTheme, 'to:', !currentTheme);
    this.setTheme(!currentTheme);
  }

  setTheme(isDark: boolean): void {
    console.log('🎨 Setting theme to:', isDark ? 'DARK' : 'LIGHT');
    
    if (typeof document !== 'undefined') {
      const html = document.documentElement;

      if (isDark) {
        html.classList.add('dark');
        localStorage?.setItem('theme', 'dark');
        console.log('✅ Dark mode class added to HTML');
      } else {
        html.classList.remove('dark');
        localStorage?.setItem('theme', 'light');
        console.log('✅ Dark mode class removed from HTML');
      }
      
      console.log('📋 HTML classList:', Array.from(html.classList));
      console.log('📋 HTML has dark class:', html.classList.contains('dark'));
    }

    this.darkModeSubject.next(isDark);
    console.log('📡 BehaviorSubject updated to:', isDark);
  }

  get isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
}
