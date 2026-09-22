import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import SalesPosComponent from '../components/sales-pos/sales-pos';
import { EmailNotificationService } from './email-notification.service';

describe('EmailNotificationService dependency injection', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SalesPosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('creates the email service without a circular dependency', () => {
    expect(TestBed.inject(EmailNotificationService)).toBeTruthy();
  });

  it('creates the POS component with email notifications available', () => {
    expect(TestBed.createComponent(SalesPosComponent).componentInstance).toBeTruthy();
  });
});