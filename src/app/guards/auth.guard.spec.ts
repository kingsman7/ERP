import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { authGuard, loginRedirectGuard } from './auth.guard';

describe('password-change route guards', () => {
  let authService: {
    authInitialized: ReturnType<typeof signal<boolean>>;
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<{ mustChangePassword?: boolean }>>;
  };
  let createUrlTree: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authService = {
      authInitialized: signal(true),
      isAuthenticated: signal(true),
      currentUser: signal({ mustChangePassword: true })
    };
    createUrlTree = vi.fn((commands: string[]) => ({ commands }) as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { createUrlTree } }
      ]
    });
  });

  it('redirects protected routes to mandatory password change while the flag is set', async () => {
    const result = TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/app/dashboard' } as RouterStateSnapshot
    )) as Observable<boolean | UrlTree>;

    await firstValueFrom(result);
    expect(createUrlTree).toHaveBeenCalledWith(['/app/change-password']);
  });

  it('allows only the password-change route while the flag is set', async () => {
    const result = TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/app/change-password' } as RouterStateSnapshot
    )) as Observable<boolean | UrlTree>;

    await expect(firstValueFrom(result)).resolves.toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('returns users to the dashboard after the flag has been cleared', async () => {
    authService.currentUser.set({ mustChangePassword: false });
    const result = TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/app/change-password' } as RouterStateSnapshot
    )) as Observable<boolean | UrlTree>;

    await firstValueFrom(result);
    expect(createUrlTree).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('redirects an authenticated user away from login to the required destination', async () => {
    const result = TestBed.runInInjectionContext(() => loginRedirectGuard(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot
    )) as Observable<boolean | UrlTree>;

    await firstValueFrom(result);
    expect(createUrlTree).toHaveBeenCalledWith(['/app/change-password']);
  });
});