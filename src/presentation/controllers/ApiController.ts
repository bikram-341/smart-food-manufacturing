import { Router, Request, Response } from 'express';
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
import { OrderApplicationService } from '../../application/services/OrderApplicationService.js';
import { BillingApplicationService } from '../../application/services/BillingApplicationService.js';
import { ProductionApplicationService } from '../../application/services/ProductionApplicationService.js';
import { PurchaseApplicationService } from '../../application/services/PurchaseApplicationService.js';
import { PaymentApplicationService } from '../../application/services/PaymentApplicationService.js';
import { ReportingApplicationService } from '../../application/services/ReportingApplicationService.js';
import { BenchmarkRunnerService } from '../../application/services/BenchmarkRunnerService.js';
import { InvoicePdfGenerator } from '../../infrastructure/pdf/InvoicePdfGenerator.js';
import { ExcelExportService, TallyXmlExportService } from '../../infrastructure/export/ExportServices.js';
import { seedMasterData } from '../../infrastructure/database/seeder.js';

export function createApiRouter(): Router {
  const router = Router();

  // Instantiate Repositories
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

  // Instantiate Services
  const orderService = new OrderApplicationService(orderRepo, itemRepo, customerRepo, stockLedgerRepo, auditRepo);
  const billingService = new BillingApplicationService(orderRepo, invoiceRepo, customerRepo, itemRepo, stockLedgerRepo, auditRepo);
  const productionService = new ProductionApplicationService(bomRepo, itemRepo, productionRepo, stockLedgerRepo, auditRepo);
  const purchaseService = new PurchaseApplicationService(purchaseRepo, supplierRepo, itemRepo, stockLedgerRepo, auditRepo);
  const paymentService = new PaymentApplicationService(paymentRepo, customerRepo, invoiceRepo, auditRepo);
  const reportingService = new ReportingApplicationService(invoiceRepo, purchaseRepo, stockLedgerRepo, productionRepo, paymentRepo, customerRepo, itemRepo);
  const benchmarkService = new BenchmarkRunnerService();

  // ==========================================
  // MASTER DATA ROUTES
  // ==========================================
  router.get('/items', async (_req: Request, res: Response) => {
    try {
      const items = await itemRepo.findAll();
      const balances = await stockLedgerRepo.getAllBalances();
      const enriched = items.map((i) => ({
        ...i,
        standardRateRupees: i.standardRate.getRupees(),
        currentBalance: balances.get(i.id)?.currentBalance ?? 0,
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/customers', async (_req: Request, res: Response) => {
    try {
      const customers = await customerRepo.findAll();
      res.json(customers.map((c) => ({ ...c, creditLimitRupees: c.creditLimit.getRupees() })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/suppliers', async (_req: Request, res: Response) => {
    try {
      const suppliers = await supplierRepo.findAll();
      res.json(suppliers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/boms', async (_req: Request, res: Response) => {
    try {
      const boms = await bomRepo.findAll();
      res.json(boms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/seed', async (_req: Request, res: Response) => {
    try {
      await seedMasterData();
      res.json({ success: true, message: 'Master data successfully re-seeded to initial benchmark state' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // SALES ORDER ROUTES (Salesman & Admin)
  // ==========================================
  router.get('/orders', async (req: Request, res: Response) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const salesmanId = req.query.salesmanId as string | undefined;
      const status = req.query.status as string | undefined;
      const orders = await orderService.getAllOrders({ customerId, salesmanId, status });
      const enriched = orders.map((o) => ({
        ...o,
        totalTaxableRupees: o.getTotalTaxableAmount().getRupees(),
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/orders/:id', async (req: Request, res: Response) => {
    try {
      const order = await orderService.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json({
        ...order,
        totalTaxableRupees: order.getTotalTaxableAmount().getRupees(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/orders', async (req: Request, res: Response) => {
    try {
      const order = await orderService.placeOrder(req.body);
      res.status(201).json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/orders/:id/stock-check', async (req: Request, res: Response) => {
    try {
      const stockCheck = await orderService.checkStockAvailability(req.params.id);
      res.json(stockCheck);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/orders/:id/approve', async (req: Request, res: Response) => {
    try {
      const { adminUserId, modifications } = req.body;
      const order = await orderService.approveOrder(req.params.id, adminUserId ?? 'admin', modifications);
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/orders/:id/reject', async (req: Request, res: Response) => {
    try {
      const { adminUserId, reason } = req.body;
      const order = await orderService.rejectOrder(req.params.id, adminUserId ?? 'admin', reason ?? 'Rejected by admin');
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // INVOICING & BILLING ROUTES (Admin)
  // ==========================================
  router.get('/invoices', async (req: Request, res: Response) => {
    try {
      const invoices = await billingService.getAllInvoices();
      res.json(
        invoices.map((inv) => ({
          ...inv,
          totalTaxableRupees: inv.totalTaxable.getRupees(),
          totalCgstRupees: inv.totalCgst.getRupees(),
          totalSgstRupees: inv.totalSgst.getRupees(),
          totalIgstRupees: inv.totalIgst.getRupees(),
          grandTotalRupees: inv.grandTotal.getRupees(),
        }))
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/invoices/:id', async (req: Request, res: Response) => {
    try {
      const inv = await billingService.getInvoiceById(req.params.id);
      if (!inv) return res.status(404).json({ error: 'Invoice not found' });
      res.json({
        ...inv,
        totalTaxableRupees: inv.totalTaxable.getRupees(),
        totalCgstRupees: inv.totalCgst.getRupees(),
        totalSgstRupees: inv.totalSgst.getRupees(),
        totalIgstRupees: inv.totalIgst.getRupees(),
        grandTotalRupees: inv.grandTotal.getRupees(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/invoices/:id/pdf', async (req: Request, res: Response) => {
    try {
      const inv = await billingService.getInvoiceById(req.params.id);
      if (!inv) return res.status(404).json({ error: 'Invoice not found' });
      const pdfBuffer = await InvoicePdfGenerator.generateInvoicePdf(inv);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${inv.invoiceNumber.replace(/\//g, '_')}.pdf"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/invoices/generate', async (req: Request, res: Response) => {
    try {
      const { orderId, adminUserId, financialYear } = req.body;
      const invoice = await billingService.generateInvoice(orderId, adminUserId ?? 'admin', financialYear);
      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/orders/:id/dispatch', async (req: Request, res: Response) => {
    try {
      const { adminUserId, transportMode, vehicleNumber } = req.body;
      const invoice = await billingService.recordDispatch({
        orderId: req.params.id,
        adminUserId: adminUserId ?? 'admin',
        transportMode,
        vehicleNumber,
      });
      res.json({ success: true, invoice });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/invoices/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { adminUserId, reason } = req.body;
      const creditNote = await billingService.cancelInvoice(req.params.id, adminUserId ?? 'admin', reason);
      res.json({ success: true, creditNote });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/credit-notes', async (_req: Request, res: Response) => {
    try {
      const cns = await billingService.getCreditNotes();
      res.json(cns.map((c) => ({ ...c, amountRupees: c.amount.getRupees() })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // PRODUCTION & BOM ROUTES (Floor Supervisor)
  // ==========================================
  router.get('/production/runs', async (_req: Request, res: Response) => {
    try {
      const runs = await productionService.getAllRuns();
      res.json(
        runs.map((r) => ({
          ...r,
          labourCostRupees: r.labourCost.getRupees(),
          overheadCostRupees: r.overheadCost.getRupees(),
          materialsCostRupees: r.materialsCost.getRupees(),
          totalManufacturingCostRupees: r.totalManufacturingCost.getRupees(),
          costPerPacketRupees: r.costPerPacket.getRupees(),
        }))
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/production/runs', async (req: Request, res: Response) => {
    try {
      const run = await productionService.recordProductionRun(req.body);
      res.status(201).json({
        ...run,
        costPerPacketRupees: run.costPerPacket.getRupees(),
        totalManufacturingCostRupees: run.totalManufacturingCost.getRupees(),
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // PURCHASES & SUPPLIERS
  // ==========================================
  router.get('/purchases', async (_req: Request, res: Response) => {
    try {
      const purchases = await purchaseService.getAllPurchases();
      res.json(
        purchases.map((p) => ({
          ...p,
          totalTaxableRupees: p.totalTaxable.getRupees(),
          totalCgstRupees: p.totalCgst.getRupees(),
          totalSgstRupees: p.totalSgst.getRupees(),
          totalIgstRupees: p.totalIgst.getRupees(),
          grandTotalRupees: p.grandTotal.getRupees(),
        }))
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/purchases', async (req: Request, res: Response) => {
    try {
      const purchase = await purchaseService.recordPurchase(req.body);
      res.status(201).json(purchase);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // PAYMENTS & RECEIVABLES
  // ==========================================
  router.get('/payments', async (req: Request, res: Response) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const payments = await paymentService.getAllPayments(customerId);
      res.json(payments.map((p) => ({ ...p, amountRupees: p.amount.getRupees() })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/payments', async (req: Request, res: Response) => {
    try {
      const payment = await paymentService.recordPayment(req.body);
      res.status(201).json({ ...payment, amountRupees: payment.amount.getRupees() });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/customers/:id/outstanding', async (req: Request, res: Response) => {
    try {
      const summary = await paymentService.getCustomerOutstanding(req.params.id);
      res.json({
        ...summary,
        totalInvoicedRupees: summary.totalInvoiced.getRupees(),
        totalCreditNotesRupees: summary.totalCreditNotes.getRupees(),
        totalPaidRupees: summary.totalPaid.getRupees(),
        currentOutstandingRupees: summary.currentOutstanding.getRupees(),
        ageingRupees: {
          current0To30: summary.ageing.current0To30.getRupees(),
          days31To60: summary.ageing.days31To60.getRupees(),
          days61To90: summary.ageing.days61To90.getRupees(),
          daysAbove90: summary.ageing.daysAbove90.getRupees(),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // INVENTORY & STOCK LEDGER
  // ==========================================
  router.get('/inventory/summary', async (_req: Request, res: Response) => {
    try {
      const summary = await reportingService.getStockSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/inventory/ledger', async (req: Request, res: Response) => {
    try {
      const itemId = req.query.itemId as string | undefined;
      const ledger = itemId
        ? await stockLedgerRepo.getLedgerForItem(itemId)
        : await stockLedgerRepo.getFullLedger();
      res.json(
        ledger.map((l) => ({
          ...l,
          unitRateRupees: l.unitRate.getRupees(),
          totalValuationRupees: l.totalValuation.getRupees(),
        }))
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // REPORTS FOR ACCOUNTS & AUDIT (Auditor & Owner)
  // ==========================================
  router.get('/reports/sales-register', async (req: Request, res: Response) => {
    try {
      const reg = await reportingService.getSalesRegister();
      if (req.query.format === 'xlsx') {
        const buffer = ExcelExportService.exportSalesRegister(reg);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_register.xlsx"');
        return res.send(buffer);
      }
      res.json(reg);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/reports/gst-summary', async (req: Request, res: Response) => {
    try {
      const report = await reportingService.getGstSummaryReport();
      if (req.query.format === 'xlsx') {
        const buffer = ExcelExportService.exportGstReport(report);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="gst_summary_report.xlsx"');
        return res.send(buffer);
      }
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/reports/stock-summary/export', async (_req: Request, res: Response) => {
    try {
      const summary = await reportingService.getStockSummary();
      const buffer = ExcelExportService.exportStockSummary(summary);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="stock_summary.xlsx"');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/reports/stock-ledger/export', async (_req: Request, res: Response) => {
    try {
      const ledger = await stockLedgerRepo.getFullLedger();
      const buffer = ExcelExportService.exportStockLedger(ledger);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="stock_ledger.xlsx"');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/reports/tally-xml', async (_req: Request, res: Response) => {
    try {
      const invoices = await billingService.getAllInvoices();
      const xml = TallyXmlExportService.exportInvoicesToTallyXml(invoices);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="tally_vouchers.xml"');
      res.send(xml);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/reports/dashboard', async (_req: Request, res: Response) => {
    try {
      const dashboard = await reportingService.getOwnerDashboard();
      res.json(dashboard);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // BENCHMARK RUNNER (1-Click Verification)
  // ==========================================
  router.post('/benchmark/run', async (_req: Request, res: Response) => {
    try {
      const report = await benchmarkService.executeBenchmark();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AUDIT TRAIL LOGS
  // ==========================================
  router.get('/audit-logs', async (_req: Request, res: Response) => {
    try {
      const logs = await auditRepo.getLogs({ limit: 100 });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
