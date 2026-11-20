export type UserRole = 'SALESMAN_A' | 'SALESMAN_B' | 'ADMIN' | 'PRODUCTION' | 'AUDITOR' | 'OWNER' | 'BENCHMARK';

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: 'RAW_MATERIAL' | 'PACKAGING' | 'FINISHED_GOOD';
  unit: string;
  hsnCode: string;
  taxRatePercent: number;
  standardRateRupees: number;
  currentBalance: number;
}

export interface Customer {
  id: string;
  name: string;
  type: 'RETAILER' | 'DISTRIBUTOR';
  gstin: string;
  stateCode: string;
  stateName: string;
  phone: string;
  address: string;
  creditLimitRupees: number;
}

export interface OrderItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  taxRatePercent: number;
  unitPrice: { rupees: number };
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerStateCode: string;
  salesmanId: string;
  salesmanName: string;
  orderDate: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'INVOICED' | 'DISPATCHED' | 'CANCELLED';
  totalTaxableRupees: number;
  items: OrderItem[];
  offlineId?: string;
  rejectionReason?: string;
}

export interface InvoiceItem {
  id: string;
  itemId: string;
  itemName: string;
  hsnCode: string;
  quantity: number;
  taxRatePercent: number;
  taxableAmount: { rupees: number };
  cgstAmount: { rupees: number };
  sgstAmount: { rupees: number };
  igstAmount: { rupees: number };
  totalAmount: { rupees: number };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  financialYear: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerGstin: string;
  customerStateName: string;
  customerStateCode: string;
  invoiceDate: string;
  isInterState: boolean;
  totalTaxableRupees: number;
  totalCgstRupees: number;
  totalSgstRupees: number;
  totalIgstRupees: number;
  grandTotalRupees: number;
  status: 'ISSUED' | 'CANCELLED';
  items: InvoiceItem[];
}

export interface ProductionRun {
  id: string;
  runNumber: string;
  productName: string;
  runDate: string;
  plannedOutputPackets: number;
  actualOutputPackets: number;
  yieldVariancePercent: number;
  isYieldAlert: boolean;
  labourCostRupees: number;
  overheadCostRupees: number;
  materialsCostRupees: number;
  totalManufacturingCostRupees: number;
  costPerPacketRupees: number;
  status: string;
  ingredients: Array<{
    itemId: string;
    itemName: string;
    unit: string;
    plannedQuantity: number;
    actualQuantity: number;
    variancePercent: number;
    isVarianceAlert: boolean;
  }>;
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
