import {
  IPaymentRepository,
  ICustomerRepository,
  IInvoiceRepository,
  IAuditRepository,
} from '../interfaces/IRepositories.js';
import { Payment } from '../../domain/entities/Payment.js';
import { AuditLog } from '../../domain/entities/PurchaseOrder.js';
import { Money } from '../../domain/value-objects/Money.js';

export interface RecordPaymentCommand {
  customerId: string;
  amountRupees: number;
  invoiceId?: string;
  paymentMode: 'CASH' | 'UPI' | 'NEFT' | 'CHEQUE';
  referenceNumber?: string;
  paymentDate?: Date;
  notes?: string;
  userId?: string;
}

export interface CustomerOutstandingSummary {
  customerId: string;
  customerName: string;
  totalInvoiced: Money;
  totalCreditNotes: Money;
  totalPaid: Money;
  currentOutstanding: Money;
  ageing: {
    current0To30: Money;
    days31To60: Money;
    days61To90: Money;
    daysAbove90: Money;
  };
}

export class PaymentApplicationService {
  constructor(
    private paymentRepo: IPaymentRepository,
    private customerRepo: ICustomerRepository,
    private invoiceRepo: IInvoiceRepository,
    private auditRepo: IAuditRepository
  ) {}

  public async recordPayment(cmd: RecordPaymentCommand): Promise<Payment> {
    const customer = await this.customerRepo.findById(cmd.customerId);
    if (!customer) {
      throw new Error(`Customer ${cmd.customerId} not found`);
    }

    if (cmd.amountRupees <= 0) {
      throw new Error('Payment amount must be positive');
    }

    const paymentNumber = await this.paymentRepo.getNextPaymentNumber();
    const amount = Money.fromRupees(cmd.amountRupees);

    const payment = new Payment({
      id: `pay_${Math.random().toString(36).substring(2, 9)}`,
      paymentNumber,
      customerId: customer.id,
      invoiceId: cmd.invoiceId,
      amount,
      paymentDate: cmd.paymentDate ?? new Date(),
      paymentMode: cmd.paymentMode,
      referenceNumber: cmd.referenceNumber,
      notes: cmd.notes,
    });

    await this.paymentRepo.save(payment);

    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        userId: cmd.userId ?? 'admin',
        username: 'admin',
        userRole: 'ADMIN',
        action: 'PAYMENT_RECORDED',
        entityName: 'Payment',
        entityId: payment.id,
        afterStateJson: JSON.stringify({
          paymentNumber: payment.paymentNumber,
          customer: customer.name,
          amount: amount.getRupees(),
          mode: payment.paymentMode,
        }),
      })
    );

    return payment;
  }

  public async getCustomerOutstanding(customerId: string): Promise<CustomerOutstandingSummary> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const invoices = await this.invoiceRepo.findAll({ customerId });
    const creditNotes = (await this.invoiceRepo.getCreditNotes()).filter((c) => c.customerId === customerId);
    const payments = await this.paymentRepo.findAll({ customerId });

    let totalInvoiced = Money.zero();
    let totalCreditNotes = Money.zero();
    let totalPaid = Money.zero();

    // Ageing buckets
    const now = new Date();
    let current0To30 = Money.zero();
    let days31To60 = Money.zero();
    let days61To90 = Money.zero();
    let daysAbove90 = Money.zero();

    for (const inv of invoices) {
      if (inv.status !== 'CANCELLED') {
        totalInvoiced = totalInvoiced.add(inv.grandTotal);

        const ageDays = Math.floor((now.getTime() - inv.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays <= 30) {
          current0To30 = current0To30.add(inv.grandTotal);
        } else if (ageDays <= 60) {
          days31To60 = days31To60.add(inv.grandTotal);
        } else if (ageDays <= 90) {
          days61To90 = days61To90.add(inv.grandTotal);
        } else {
          daysAbove90 = daysAbove90.add(inv.grandTotal);
        }
      }
    }

    for (const cn of creditNotes) {
      totalCreditNotes = totalCreditNotes.add(cn.amount);
    }

    for (const p of payments) {
      totalPaid = totalPaid.add(p.amount);
    }

    const currentOutstanding = totalInvoiced.subtract(totalCreditNotes).subtract(totalPaid);

    return {
      customerId: customer.id,
      customerName: customer.name,
      totalInvoiced,
      totalCreditNotes,
      totalPaid,
      currentOutstanding,
      ageing: {
        current0To30,
        days31To60,
        days61To90,
        daysAbove90,
      },
    };
  }

  public async getAllPayments(customerId?: string): Promise<Payment[]> {
    return this.paymentRepo.findAll(customerId ? { customerId } : undefined);
  }
}
