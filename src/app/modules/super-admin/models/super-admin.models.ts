export interface MasterCompany {
  id?: string;
  name?: string;
  legalName?: string;
  tradeName?: string;
  taxId?: string;
  rif?: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: unknown;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  storageLimitMb: number;
  features: Record<string, unknown>;
}

export type BillingSubscriptionStatus = 'NONE' | 'PENDING' | 'ACTIVE' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface BillingSubscription {
  planId: string | null;
  subscriptionId: string | null;
  status: BillingSubscriptionStatus;
}

export interface PendingBillingCheckout {
  id: string;
  planId: string;
  status: 'PENDING';
  orderId: string;
  checkoutUrl?: string | null;
}
