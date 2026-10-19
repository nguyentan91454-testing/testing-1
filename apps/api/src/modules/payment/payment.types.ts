import { PaymentMethod, PaymentStatus } from '@techstore/shared';

export interface PaymentIntentResult {
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  paymentUrl?: string;
  qrCodeUrl?: string;
  details?: Record<string, any>;
}

export interface IPaymentProvider {
  createPayment(orderId: string, amount: number, method: PaymentMethod, metadata?: any): Promise<PaymentIntentResult>;
  verifyPayment(transactionId: string): Promise<{ success: boolean; status: PaymentStatus }>;
  refundPayment(transactionId: string, amount: number): Promise<{ success: boolean }>;
}
