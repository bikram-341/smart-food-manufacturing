import * as XLSX from 'xlsx';
import { SalesRegisterEntry, StockSummaryItem, GstSummaryReport } from '../../application/services/ReportingApplicationService.js';
import { PurchaseOrder } from '../../domain/entities/PurchaseOrder.js';
import { StockLedgerEntry } from '../../domain/entities/StockLedgerEntry.js';
import { Invoice } from '../../domain/entities/Invoice.js';

export class ExcelExportService {
  public static exportSalesRegister(data: SalesRegisterEntry[]): Buffer {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  public static exportStockSummary(data: StockSummaryItem[]): Buffer {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Summary');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  public static exportStockLedger(data: StockLedgerEntry[]): Buffer {
    const formatted = data.map((d) => ({
      Timestamp: d.timestamp.toISOString(),
      Item: d.itemName,
      Category: d.itemCategory,
      Unit: d.unit,
      MovementType: d.movementType,
      ReferenceDoc: `${d.referenceType} (${d.referenceNumber})`,
      QuantityChange: d.quantityChange,
      RunningBalance: d.balanceAfter,
      RateINR: d.unitRate.getRupees(),
      ValuationINR: d.totalValuation.getRupees(),
      Notes: d.notes ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Ledger');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  public static exportGstReport(data: GstSummaryReport): Buffer {
    const wb = XLSX.utils.book_new();

    const gstr1Summary = [
      {
        Section: 'Table 4 - B2B Intra-State (CGST + SGST)',
        VoucherCount: data.gstr1.table4_b2b_intraState.count,
        TaxableValue: data.gstr1.table4_b2b_intraState.taxableAmount,
        CGST: data.gstr1.table4_b2b_intraState.cgstAmount,
        SGST: data.gstr1.table4_b2b_intraState.sgstAmount,
        IGST: 0,
        TotalInvoiceValue: data.gstr1.table4_b2b_intraState.totalInvoiceValue,
      },
      {
        Section: 'Table 5 - B2B Inter-State (IGST)',
        VoucherCount: data.gstr1.table5_b2b_interState.count,
        TaxableValue: data.gstr1.table5_b2b_interState.taxableAmount,
        CGST: 0,
        SGST: 0,
        IGST: data.gstr1.table5_b2b_interState.igstAmount,
        TotalInvoiceValue: data.gstr1.table5_b2b_interState.totalInvoiceValue,
      },
    ];

    const ws1 = XLSX.utils.json_to_sheet(gstr1Summary);
    XLSX.utils.book_append_sheet(wb, ws1, 'GSTR-1 Outward Supplies');

    const ws2 = XLSX.utils.json_to_sheet(data.gstr1.table12_hsnSummary);
    XLSX.utils.book_append_sheet(wb, ws2, 'Table 12 HSN Summary');

    const gstr3bSummary = [
      {
        Heading: '3.1 Outward Taxable Supplies',
        TaxableValue: data.gstr3b.section3_1_outwardSupplies.taxableValue,
        IGST: data.gstr3b.section3_1_outwardSupplies.igst,
        CGST: data.gstr3b.section3_1_outwardSupplies.cgst,
        SGST: data.gstr3b.section3_1_outwardSupplies.sgst,
      },
      {
        Heading: '4. Eligible Input Tax Credit (ITC)',
        TaxableValue: data.gstr3b.eligibleItc.taxableValue,
        IGST: data.gstr3b.eligibleItc.igst,
        CGST: data.gstr3b.eligibleItc.cgst,
        SGST: data.gstr3b.eligibleItc.sgst,
      },
    ];
    const ws3 = XLSX.utils.json_to_sheet(gstr3bSummary);
    XLSX.utils.book_append_sheet(wb, ws3, 'GSTR-3B Summary');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

export class TallyXmlExportService {
  /**
   * Generates standard Tally XML vouchers for sales invoices.
   * Can be directly imported into TallyPrime via 'Import Data -> Vouchers'.
   */
  public static exportInvoicesToTallyXml(invoices: Invoice[]): string {
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
`;

    for (const inv of invoices) {
      if (inv.status === 'CANCELLED') continue;
      const dateStr = inv.invoiceDate.toISOString().split('T')[0].replace(/-/g, '');

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${dateStr}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${inv.invoiceNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${this.escapeXml(inv.customerName)}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            
            <!-- Customer Debit Entry -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${this.escapeXml(inv.customerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${inv.grandTotal.getRupees().toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- Sales Credit Entry -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account - Snacks</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${inv.totalTaxable.getRupees().toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;

      if (inv.isInterState) {
        xml += `            <!-- IGST Entry -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output IGST 5%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${inv.totalIgst.getRupees().toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;
      } else {
        xml += `            <!-- CGST Entry -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST 2.5%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${inv.totalCgst.getRupees().toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- SGST Entry -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST 2.5%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${inv.totalSgst.getRupees().toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;
      }

      xml += `          </VOUCHER>
        </TALLYMESSAGE>
`;
    }

    xml += `      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xml;
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
