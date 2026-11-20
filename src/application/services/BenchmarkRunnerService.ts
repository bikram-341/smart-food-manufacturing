import { seedMasterData } from '../../infrastructure/database/seeder.js';
import {
  SqliteItemRepository,
  SqliteCustomerRepository,
  SqliteSupplierRepository,
} from '../../infrastructure/repositories/SqliteMasterRepositories.js';
import {
  SqliteBOMRepository,
  SqliteStockLedgerRepository,
} from '../../infrastructure/repositories/SqliteStockRepositories.js';
import {
  SqliteOrderRepository,
  SqliteInvoiceRepository,
  SqliteProductionRunRepository,
  SqlitePurchaseRepository,
  SqlitePaymentRepository,
  SqliteAuditRepository,
} from '../../infrastructure/repositories/SqliteTransactionalRepositories.js';
import { PurchaseApplicationService } from './PurchaseApplicationService.js';
import { ProductionApplicationService } from './ProductionApplicationService.js';
import { OrderApplicationService } from './OrderApplicationService.js';
import { BillingApplicationService } from './BillingApplicationService.js';
import { PaymentApplicationService } from './PaymentApplicationService.js';
import { ReportingApplicationService } from './ReportingApplicationService.js';

export interface BenchmarkStepResult {
  stepNumber: number;
  stepDescription: string;
  status: 'COMPLETED' | 'FAILED';
  details: any;
}

export interface BenchmarkCheckResult {
  checkName: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string;
}

export interface BenchmarkScenarioReport {
  timestamp: string;
  overallStatus: 'PASS' | 'FAIL';
  valuationMethodUsed: string;
  stepsExecuted: BenchmarkStepResult[];
  resultsChecked: BenchmarkCheckResult[];
}

export class BenchmarkRunnerService {
  public async executeBenchmark(): Promise<BenchmarkScenarioReport> {
    // Step 0: Clean seed
    await seedMasterData();

    const itemRepo = new SqliteItemRepository();
    const customerRepo = new SqliteCustomerRepository();
    const supplierRepo = new SqliteSupplierRepository();
    const bomRepo = new SqliteBOMRepository();
    const stockLedgerRepo = new SqliteStockLedgerRepository();
    const orderRepo = new SqliteOrderRepository();
    const invoiceRepo = new SqliteInvoiceRepository();
    const productionRepo = new SqliteProductionRunRepository();
    const purchaseRepo = new SqlitePurchaseRepository();
    const paymentRepo = new SqlitePaymentRepository();
    const auditRepo = new SqliteAuditRepository();

    const purchaseService = new PurchaseApplicationService(purchaseRepo, supplierRepo, itemRepo, stockLedgerRepo, auditRepo);
    const productionService = new ProductionApplicationService(bomRepo, itemRepo, productionRepo, stockLedgerRepo, auditRepo);
    const orderService = new OrderApplicationService(orderRepo, itemRepo, customerRepo, stockLedgerRepo, auditRepo);
    const billingService = new BillingApplicationService(orderRepo, invoiceRepo, customerRepo, itemRepo, stockLedgerRepo, auditRepo);
    const paymentService = new PaymentApplicationService(paymentRepo, customerRepo, invoiceRepo, auditRepo);
    const reportingService = new ReportingApplicationService(invoiceRepo, purchaseRepo, stockLedgerRepo, productionRepo, paymentRepo, customerRepo, itemRepo);

    const stepsExecuted: BenchmarkStepResult[] = [];

    // Step 1: Record a purchase of 60 kg flour at ₹45/kg
    const supplier = (await supplierRepo.findAll())[0];
    const flourItem = await itemRepo.findBySku('RM-FLOUR-01');
    if (!flourItem) throw new Error('Flour item not found');

    const purchase1 = await purchaseService.recordPurchase({
      supplierId: supplier.id,
      supplierInvoiceNumber: 'SUP-INV-2026-089',
      purchaseDate: new Date('2026-11-02T10:00:00Z'),
      items: [
        {
          itemId: flourItem.id,
          quantity: 60,
          rateRupees: 45,
          batchNumber: 'PUR-FLOUR-02',
        },
      ],
      notes: 'Benchmark Step 1: Purchase 60 kg flour @ ₹45/kg',
    });

    stepsExecuted.push({
      stepNumber: 1,
      stepDescription: 'Record a purchase of 60 kg flour at ₹45/kg',
      status: 'COMPLETED',
      details: {
        purchaseNumber: purchase1.purchaseNumber,
        item: 'Flour',
        quantity: 60,
        rate: '₹45/kg',
        flourBalanceAfterPurchase: await stockLedgerRepo.getCurrentBalance(flourItem.id),
      },
    });

    // Step 2 & 3: Production Run of Murukku 200g
    // Issue 40 kg flour, 10.5 L oil (0.5 L over standard), 1.2 kg spice mix
    // Record output: 188 good packets, 6 pouches damaged, 9 cartons used
    // Overheads: Labour ₹1,200, Gas/power ₹600
    const oilItem = await itemRepo.findBySku('RM-OIL-01');
    const spiceItem = await itemRepo.findBySku('RM-SPICE-01');
    const pouchItem = await itemRepo.findBySku('PM-POUCH-200G');
    const murukkuItem = await itemRepo.findBySku('FG-MURUKKU-200G');

    if (!oilItem || !spiceItem || !pouchItem || !murukkuItem) {
      throw new Error('Master items missing for production run');
    }

    const prodRun = await productionService.recordProductionRun({
      productId: murukkuItem.id,
      supervisorUserId: 'usr_prod',
      actualGoodPackets: 188,
      issuedIngredients: [
        { itemId: flourItem.id, actualQuantity: 40 },
        { itemId: oilItem.id, actualQuantity: 10.5 },
        { itemId: spiceItem.id, actualQuantity: 1.2 },
      ],
      damagedPackaging: [
        { itemId: pouchItem.id, quantity: 6, reason: 'Sealing machine temperature spike damaged pouch film' },
      ],
      cartonsUsed: 9,
      labourCostRupees: 1200,
      overheadCostRupees: 600,
      valuationMethod: 'FIFO',
      notes: 'Benchmark Step 2 & 3: Production Run 1 of Murukku 200g',
    });

    const fgAfterRun = await stockLedgerRepo.getCurrentBalance(murukkuItem.id);

    stepsExecuted.push({
      stepNumber: 2,
      stepDescription: 'Start production run: Issue 40 kg flour, 10.5 L oil (0.5 L over standard), 1.2 kg spice mix',
      status: 'COMPLETED',
      details: {
        runNumber: prodRun.runNumber,
        flourIssued: '40 kg',
        oilIssued: '10.5 L (planned 10.0 L)',
        spiceIssued: '1.2 kg',
      },
    });

    stepsExecuted.push({
      stepNumber: 3,
      stepDescription: 'Record actual output: 188 good packets, 6 damaged pouches, 9 cartons used',
      status: 'COMPLETED',
      details: {
        actualOutput: '188 packets',
        expectedOutput: '200 packets',
        yieldVariance: `${prodRun.yieldVariancePercent}%`,
        isYieldAlert: prodRun.isYieldAlert,
        costPerPacket: prodRun.costPerPacket.formatInr(),
        finishedGoodsBalanceAfterRun: fgAfterRun,
      },
    });

    // Step 4: Salesman A places order for Retailer A (Tamil Nadu): 150 packets
    const retailerA = (await customerRepo.findAll()).find((c) => c.stateCode === '33');
    if (!retailerA) throw new Error('Retailer A not found');

    const orderA = await orderService.placeOrder({
      customerId: retailerA.id,
      salesmanId: 'usr_sales_a',
      items: [{ itemId: murukkuItem.id, quantity: 150, unitPriceRupees: 50 }],
    });

    stepsExecuted.push({
      stepNumber: 4,
      stepDescription: 'Salesman A places order for Retailer A (Tamil Nadu): 150 packets',
      status: 'COMPLETED',
      details: {
        orderNumber: orderA.orderNumber,
        customer: retailerA.name,
        quantity: 150,
        rate: '₹50/packet',
        taxable: orderA.getTotalTaxableAmount().formatInr(),
      },
    });

    // Step 5: Admin approves it, raises GST invoice (CGST + SGST) and records dispatch
    await orderService.approveOrder(orderA.id, 'usr_admin');
    const invoiceA = await billingService.generateInvoice(orderA.id, 'usr_admin', '2026-27');
    await billingService.recordDispatch({ orderId: orderA.id, adminUserId: 'usr_admin' });

    const fgAfterDispatch = await stockLedgerRepo.getCurrentBalance(murukkuItem.id);

    stepsExecuted.push({
      stepNumber: 5,
      stepDescription: 'Admin approves order, raises GST invoice (CGST + SGST) and records dispatch',
      status: 'COMPLETED',
      details: {
        invoiceNumber: invoiceA.invoiceNumber,
        taxable: invoiceA.totalTaxable.formatInr(),
        cgst: invoiceA.totalCgst.formatInr(),
        sgst: invoiceA.totalSgst.formatInr(),
        grandTotal: invoiceA.grandTotal.formatInr(),
        finishedGoodsRemaining: fgAfterDispatch,
      },
    });

    // Step 6: Salesman B places order for Distributor B (Karnataka): 120 packets. Show shortage handling!
    const distributorB = (await customerRepo.findAll()).find((c) => c.stateCode === '29');
    if (!distributorB) throw new Error('Distributor B not found');

    const orderB = await orderService.placeOrder({
      customerId: distributorB.id,
      salesmanId: 'usr_sales_b',
      items: [{ itemId: murukkuItem.id, quantity: 120, unitPriceRupees: 50 }],
    });

    const stockCheckB = await orderService.checkStockAvailability(orderB.id);

    stepsExecuted.push({
      stepNumber: 6,
      stepDescription: 'Salesman B places order for Distributor B (Karnataka): 120 packets; Check shortage',
      status: 'COMPLETED',
      details: {
        orderNumber: orderB.orderNumber,
        requestedQty: 120,
        availableStock: stockCheckB.items[0].availableQty,
        shortageQuantity: stockCheckB.totalShortagePackets,
        isFullyCovered: stockCheckB.isFullyCovered,
        interStateTaxRule: 'IGST 5% applies (Tamil Nadu -> Karnataka)',
      },
    });

    // Step 7: Record a payment of ₹4,000 from Retailer A
    const paymentA = await paymentService.recordPayment({
      customerId: retailerA.id,
      invoiceId: invoiceA.id,
      amountRupees: 4000,
      paymentMode: 'NEFT',
      referenceNumber: 'NEFT-TN-2026-99881',
      notes: 'Part-payment against invoice ' + invoiceA.invoiceNumber,
    });

    const retailerAOutstanding = await paymentService.getCustomerOutstanding(retailerA.id);

    stepsExecuted.push({
      stepNumber: 7,
      stepDescription: 'Record a payment of ₹4,000 from Retailer A',
      status: 'COMPLETED',
      details: {
        paymentNumber: paymentA.paymentNumber,
        amount: paymentA.amount.formatInr(),
        closingOutstanding: retailerAOutstanding.currentOutstanding.formatInr(),
      },
    });

    // Step 8: Add labour ₹1,200 and gas/power ₹600 for the run, show cost per packet
    stepsExecuted.push({
      stepNumber: 8,
      stepDescription: 'Add labour ₹1,200 and gas/power ₹600 for the run, then show cost per packet',
      status: 'COMPLETED',
      details: {
        directMaterialsCost: prodRun.materialsCost.formatInr(),
        labourCost: prodRun.labourCost.formatInr(),
        powerGasCost: prodRun.overheadCost.formatInr(),
        totalManufacturingCost: prodRun.totalManufacturingCost.formatInr(),
        goodOutputPackets: prodRun.actualOutputPackets,
        costPerPacket: prodRun.costPerPacket.formatInr(),
        sellingPrice: '₹50.00',
        grossMarginPerPacket: `₹${(50 - prodRun.costPerPacket.getRupees()).toFixed(2)} (${(
          ((50 - prodRun.costPerPacket.getRupees()) / 50) *
          100
        ).toFixed(1)}%)`,
      },
    });

    // Step 9: Generate Month's reports
    const salesReg = await reportingService.getSalesRegister();
    const gstReport = await reportingService.getGstSummaryReport();
    const stockSummary = await reportingService.getStockSummary();

    stepsExecuted.push({
      stepNumber: 9,
      stepDescription: 'Generate the month\'s reports from section 4.6 (Sales, GST, Stock, Receivables)',
      status: 'COMPLETED',
      details: {
        salesInvoicesCount: salesReg.length,
        gstOutwardTaxable: gstReport.gstr3b.section3_1_outwardSupplies.taxableValue,
        stockItemsTracked: stockSummary.length,
      },
    });

    // -------------------------------------------------------------
    // Results Verification against Section 5 Expected Table
    // -------------------------------------------------------------
    const flourBalance = await stockLedgerRepo.getCurrentBalance(flourItem.id);
    const oilBalance = await stockLedgerRepo.getCurrentBalance(oilItem.id);
    const pouchesBalance = await stockLedgerRepo.getCurrentBalance(pouchItem.id);
    const oilIngredient = prodRun.ingredients.find((i) => i.itemId === oilItem.id);

    const resultsChecked: BenchmarkCheckResult[] = [
      {
        checkName: 'Flour closing balance',
        expected: '120 kg (100 + 60 − 40)',
        actual: `${flourBalance} kg`,
        passed: flourBalance === 120,
      },
      {
        checkName: 'Oil closing balance',
        expected: '19.5 L (30 − 10.5)',
        actual: `${oilBalance} L`,
        passed: oilBalance === 19.5,
      },
      {
        checkName: 'Pouches closing balance',
        expected: '306 (500 − 188 used − 6 damaged)',
        actual: `${pouchesBalance}`,
        passed: pouchesBalance === 306,
      },
      {
        checkName: 'Finished goods after run',
        expected: '238 packets (50 + 188)',
        actual: `${fgAfterRun} packets`,
        passed: fgAfterRun === 238,
      },
      {
        checkName: 'Finished goods after Retailer A dispatch',
        expected: '88 packets (238 − 150)',
        actual: `${fgAfterDispatch} packets`,
        passed: fgAfterDispatch === 88,
      },
      {
        checkName: 'Yield variance',
        expected: '188 vs 200 expected, −6%, flagged',
        actual: `${prodRun.actualOutputPackets} vs ${prodRun.plannedOutputPackets} expected, ${prodRun.yieldVariancePercent}%, ${
          prodRun.isYieldAlert ? 'FLAGGED' : 'NOT FLAGGED'
        }`,
        passed: prodRun.yieldVariancePercent === -6 && prodRun.isYieldAlert === true,
      },
      {
        checkName: 'Oil consumption variance',
        expected: '+5%, flagged',
        actual: `${oilIngredient ? oilIngredient.variancePercent : 0}%, ${
          oilIngredient?.isVarianceAlert ? 'FLAGGED' : 'NOT FLAGGED'
        }`,
        passed: oilIngredient?.variancePercent === 5 && oilIngredient?.isVarianceAlert === true,
      },
      {
        checkName: 'Retailer A invoice',
        expected: '₹7,500 taxable + ₹187.50 CGST + ₹187.50 SGST = ₹7,875',
        actual: `₹${invoiceA.totalTaxable.getRupees().toLocaleString('en-IN')} taxable + ₹${invoiceA.totalCgst.getRupees().toFixed(2)} CGST + ₹${invoiceA.totalSgst.getRupees().toFixed(2)} SGST = ₹${invoiceA.grandTotal.getRupees().toLocaleString('en-IN')}`,
        passed:
          invoiceA.totalTaxable.getRupees() === 7500 &&
          invoiceA.totalCgst.getRupees() === 187.5 &&
          invoiceA.totalSgst.getRupees() === 187.5 &&
          invoiceA.grandTotal.getRupees() === 7875,
      },
      {
        checkName: 'Retailer A outstanding',
        expected: '₹3,875 (₹7,875 − ₹4,000)',
        actual: `₹${retailerAOutstanding.currentOutstanding.getRupees().toLocaleString('en-IN')}`,
        passed: retailerAOutstanding.currentOutstanding.getRupees() === 3875,
      },
      {
        checkName: 'Distributor B order shortage check',
        expected: 'Shortage of 32 packets flagged; IGST applies if invoiced',
        actual: `Shortage of ${stockCheckB.totalShortagePackets} packets flagged (Available: ${stockCheckB.items[0].availableQty}, Requested: 120); Inter-state IGST applies`,
        passed: stockCheckB.totalShortagePackets === 32 && !stockCheckB.isFullyCovered,
      },
      {
        checkName: 'Cost per packet',
        expected: '₹30.90 per packet (FIFO: Materials ₹4,010 + Overheads ₹1,800 / 188 pkts)',
        actual: `₹${prodRun.costPerPacket.getRupees().toFixed(2)} per packet (Materials: ₹${prodRun.materialsCost.getRupees()} + Overheads: ₹${prodRun.labourCost.add(prodRun.overheadCost).getRupees()} / 188)`,
        passed: prodRun.costPerPacket.getRupees() === 30.9,
        notes: 'FIFO valuation applied. Direct materials: Flour (40kg @ ₹42) ₹1680 + Oil (10.5L @ ₹140) ₹1470 + Spice (1.2kg @ ₹200) ₹240 + Pouches (194 pcs @ ₹2.50) ₹485 + Cartons (9 pcs @ ₹15) ₹135 = ₹4,010. Overheads: Labour ₹1,200 + Power/Gas ₹600 = ₹1,800. Total = ₹5,810. Cost/pkt = 5810 / 188 = ₹30.90.',
      },
    ];

    const allPassed = resultsChecked.every((c) => c.passed);

    return {
      timestamp: new Date().toISOString(),
      overallStatus: allPassed ? 'PASS' : 'FAIL',
      valuationMethodUsed: 'FIFO (First-In, First-Out) with integer-paisa math',
      stepsExecuted,
      resultsChecked,
    };
  }
}
