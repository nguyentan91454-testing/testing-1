import { IPaymentProvider, PaymentIntentResult } from './payment.types';
import { PaymentMethod, PaymentStatus } from '@techstore/shared';
import * as crypto from 'crypto';

export class MockPaymentProvider implements IPaymentProvider {
  async createPayment(orderId: string, amount: number, method: PaymentMethod, metadata?: any): Promise<PaymentIntentResult> {
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    if (method === PaymentMethod.COD) {
      return {
        transactionId,
        amount,
        status: PaymentStatus.PENDING,
        details: { note: 'Thanh toán tiền mặt khi nhận hàng (COD)' },
      };
    }

    if (method === PaymentMethod.MOCK_CARD) {
      return {
        transactionId,
        amount,
        status: PaymentStatus.PAID,
        details: {
          cardType: 'Visa/Mastercard Mock Test',
          last4: '4242',
          approvedAt: new Date().toISOString(),
        },
      };
    }

    if (method === PaymentMethod.VNPAY || method === PaymentMethod.MOMO) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TECHSTORE_PAY_${orderId}_${amount}`;
      return {
        transactionId,
        amount,
        status: PaymentStatus.PAID, // Simulated sandbox instant success
        qrCodeUrl,
        paymentUrl: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?orderId=${orderId}`,
        details: { provider: method, qrCodeUrl },
      };
    }

    return {
      transactionId,
      amount,
      status: PaymentStatus.PAID,
    };
  }

  async verifyPayment(transactionId: string): Promise<{ success: boolean; status: PaymentStatus }> {
    return { success: true, status: PaymentStatus.PAID };
  }

  async refundPayment(transactionId: string, amount: number): Promise<{ success: boolean }> {
    return { success: true };
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
