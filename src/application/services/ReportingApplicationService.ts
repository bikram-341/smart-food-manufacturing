import {
  IInvoiceRepository,
  IPurchaseRepository,
  IStockLedgerRepository,
  IProductionRunRepository,
  IPaymentRepository,
  ICustomerRepository,
  IItemRepository,
} from '../interfaces/IRepositories.js';
import { Money } from '../../domain/value-objects/Money.js';

export interface SalesRegisterEntry {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  state: string;
  productNames: string;
  totalQuantity: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  status: string;
}

export interface GstSummaryReport {
  taxPeriod: string;
  gstr1: {
    table4_b2b_intraState: {
      count: number;
      taxableAmount: number;
      cgstAmount: number;
      sgstAmount: number;
      totalTax: number;
      totalInvoiceValue: number;
    };
    table5_b2b_interState: {
      count: number;
      taxableAmount: number;
      igstAmount: number;
      totalTax: number;
      totalInvoiceValue: number;
    };
    table12_hsnSummary: Array<{
      hsnCode: string;
      description: string;
      unit: string;
      totalQuantity: number;
      totalTaxable: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalTax: number;
    }>;
  };
  gstr3b: {
    section3_1_outwardSupplies: {
      taxableValue: number;
      igst: number;
      cgst: number;
      sgst: number;
      cess: number;
    };
    eligibleItc: {
      taxableValue: number;
      cgst: number;
      sgst: number;
      igst: number;
    };
  };
}

export interface StockSummaryItem {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  openingBalance: number;
  receipts: number;
  issues: number;
  closingBalance: number;
  closingRateRupees: number;
  totalValuationRupees: number;
}

export class ReportingApplicationService {
  constructor(
    private invoiceRepo: IInvoiceRepository,
    private purchaseRepo: IPurchaseRepository,
    private stockLedgerRepo: IStockLedgerRepository,
    private productionRepo: IProductionRunRepository,
    private paymentRepo: IPaymentRepository,
    private customerRepo: ICustomerRepository,
    private itemRepo: IItemRepository
  ) {}

  public async getSalesRegister(startDate?: Date, endDate?: Date): Promise<SalesRegisterEntry[]> {
    const invoices = await this.invoiceRepo.findAll({ startDate, endDate });

    return invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString().split('T')[0],
      customerName: inv.customerName,
      customerGstin: inv.customerGstin,
      state: `${inv.customerStateName} (${inv.customerStateCode})`,
      productNames: inv.items.map((i) => i.itemName).join(', '),
      totalQuantity: inv.items.reduce((acc, i) => acc + i.quantity, 0),
      taxableAmount: inv.totalTaxable.getRupees(),
      cgstAmount: inv.totalCgst.getRupees(),
      sgstAmount: inv.totalSgst.getRupees(),
      igstAmount: inv.totalIgst.getRupees(),
      totalAmount: inv.grandTotal.getRupees(),
      status: inv.status,
    }));
  }

  public async getGstSummaryReport(startDate?: Date, endDate?: Date): Promise<GstSummaryReport> {
    const invoices = await this.invoiceRepo.findAll({ startDate, endDate });
    const purchases = await this.purchaseRepo.findAll({ startDate, endDate });

    const activeInvoices = invoices.filter((i) => i.status === 'ISSUED');

    const intraStateInvoices = activeInvoices.filter((i) => !i.isInterState);
    const interStateInvoices = activeInvoices.filter((i) => i.isInterState);

    const intraTaxable = intraStateInvoices.reduce((acc, i) => acc.add(i.totalTaxable), Money.zero());
    const intraCgst = intraStateInvoices.reduce((acc, i) => acc.add(i.totalCgst), Money.zero());
    const intraSgst = intraStateInvoices.reduce((acc, i) => acc.add(i.totalSgst), Money.zero());
    const intraTotal = intraStateInvoices.reduce((acc, i) => acc.add(i.grandTotal), Money.zero());

    const interTaxable = interStateInvoices.reduce((acc, i) => acc.add(i.totalTaxable), Money.zero());
    const interIgst = interStateInvoices.reduce((acc, i) => acc.add(i.totalIgst), Money.zero());
    const interTotal = interStateInvoices.reduce((acc, i) => acc.add(i.grandTotal), Money.zero());

    // HSN aggregation
    const hsnMap = new Map<string, { description: string; unit: string; qty: number; taxable: Money; cgst: Money; sgst: Money; igst: Money }>();
    for (const inv of activeInvoices) {
      for (const itm of inv.items) {
        const existing = hsnMap.get(itm.hsnCode) || {
          description: itm.itemName,
          unit: 'packet',
          qty: 0,
          taxable: Money.zero(),
          cgst: Money.zero(),
          sgst: Money.zero(),
          igst: Money.zero(),
        };
        existing.qty += itm.quantity;
        existing.taxable = existing.taxable.add(itm.taxableAmount);
        existing.cgst = existing.cgst.add(itm.cgstAmount);
        existing.sgst = existing.sgst.add(itm.sgstAmount);
        existing.igst = existing.igst.add(itm.igstAmount);
        hsnMap.set(itm.hsnCode, existing);
      }
    }

    const table12Hsn = Array.from(hsnMap.entries()).map(([hsn, data]) => ({
      hsnCode: hsn,
      description: data.description,
      unit: data.unit,
      totalQuantity: data.qty,
      totalTaxable: data.taxable.getRupees(),
      cgst: data.cgst.getRupees(),
      sgst: data.sgst.getRupees(),
      igst: data.igst.getRupees(),
      totalTax: data.cgst.add(data.sgst).add(data.igst).getRupees(),
    }));

    // Purchases ITC
    const itcTaxable = purchases.reduce((acc, p) => acc.add(p.totalTaxable), Money.zero());
    const itcCgst = purchases.reduce((acc, p) => acc.add(p.totalCgst), Money.zero());
    const itcSgst = purchases.reduce((acc, p) => acc.add(p.totalSgst), Money.zero());
    const itcIgst = purchases.reduce((acc, p) => acc.add(p.totalIgst), Money.zero());

    return {
      taxPeriod: 'November 2026',
      gstr1: {
        table4_b2b_intraState: {
          count: intraStateInvoices.length,
          taxableAmount: intraTaxable.getRupees(),
          cgstAmount: intraCgst.getRupees(),
          sgstAmount: intraSgst.getRupees(),
          totalTax: intraCgst.add(intraSgst).getRupees(),
          totalInvoiceValue: intraTotal.getRupees(),
        },
        table5_b2b_interState: {
          count: interStateInvoices.length,
          taxableAmount: interTaxable.getRupees(),
          igstAmount: interIgst.getRupees(),
          totalTax: interIgst.getRupees(),
          totalInvoiceValue: interTotal.getRupees(),
        },
        table12_hsnSummary: table12Hsn,
      },
      gstr3b: {
        section3_1_outwardSupplies: {
          taxableValue: intraTaxable.add(interTaxable).getRupees(),
          igst: interIgst.getRupees(),
          cgst: intraCgst.getRupees(),
          sgst: intraSgst.getRupees(),
          cess: 0,
        },
        eligibleItc: {
          taxableValue: itcTaxable.getRupees(),
          cgst: itcCgst.getRupees(),
          sgst: itcSgst.getRupees(),
          igst: itcIgst.getRupees(),
        },
      },
    };
  }

  public async getStockSummary(): Promise<StockSummaryItem[]> {
    const items = await this.itemRepo.findAll();
    const ledger = await this.stockLedgerRepo.getFullLedger();

    const summary: StockSummaryItem[] = [];

    for (const item of items) {
      const itemLedger = ledger.filter((l) => l.itemId === item.id);

      let openingBalance = 0;
      let receipts = 0;
      let issues = 0;
      let lastRateRupees = item.standardRate.getRupees();

      for (const entry of itemLedger) {
        lastRateRupees = entry.unitRate.getRupees();
        if (entry.movementType === 'OPENING_STOCK') {
          openingBalance += entry.quantityChange;
        } else if (entry.quantityChange > 0) {
          receipts += entry.quantityChange;
        } else {
          issues += Math.abs(entry.quantityChange);
        }
      }

      const closingBalance = Math.round((openingBalance + receipts - issues) * 10000) / 10000;
      const totalValuationRupees = Math.round(closingBalance * lastRateRupees * 100) / 100;

      summary.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        openingBalance,
        receipts,
        issues,
        closingBalance,
        closingRateRupees: lastRateRupees,
        totalValuationRupees,
      });
    }

    return summary;
  }

  public async getOwnerDashboard() {
    const orders = await this.invoiceRepo.findAll();
    const stockSummary = await this.getStockSummary();
    const runs = await this.productionRepo.findAll();
    const customers = await this.customerRepo.findAll();

    const totalRevenue = orders
      .filter((o) => o.status === 'ISSUED')
      .reduce((acc, o) => acc.add(o.grandTotal), Money.zero());

    const activeRuns = runs.filter((r) => r.status === 'COMPLETED');
    const varianceAlerts = activeRuns.filter((r) => r.isYieldAlert || r.ingredients.some((i) => i.isVarianceAlert));

    let totalReceivables = Money.zero();
    const payments = await this.paymentRepo.findAll();
    const totalPaid = payments.reduce((acc, p) => acc.add(p.amount), Money.zero());
    totalReceivables = totalRevenue.subtract(totalPaid);

    const latestRun = activeRuns[0];

    return {
      kpis: {
        totalRevenueRupees: totalRevenue.getRupees(),
        totalReceivablesRupees: Math.max(0, totalReceivables.getRupees()),
        activeProductionRuns: runs.length,
        varianceAlertsCount: varianceAlerts.length,
        latestCostPerPacket: latestRun ? latestRun.costPerPacket.getRupees() : 0,
      },
      stockSummary,
      recentRuns: runs.slice(0, 5),
    };
  }
}
