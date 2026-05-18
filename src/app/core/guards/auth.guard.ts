import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SessionService } from '../service/session.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private sessionService = inject(SessionService);
  private router = inject(Router);

  canActivate(): boolean {
    if (this.sessionService.isAuthenticated()) {
      return true;
    } else {
      this.router.navigate(['/auth/login']);
      return false;
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class NoAuthGuard implements CanActivate {
  private sessionService = inject(SessionService);
  private router = inject(Router);

  canActivate(): boolean {
    if (this.sessionService.isAuthenticated()) {
      this.router.navigate(['/company/dashboard']);
      return false;
    }
    return true;
  }
}
