import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  BookOpen,
  Receipt,
  Layers,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const AuditorPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SALES' | 'GST' | 'STOCK_SUMMARY' | 'STOCK_LEDGER' | 'RECEIVABLES'>('SALES');
  const [salesRegister, setSalesRegister] = useState<any[]>([]);
  const [gstReport, setGstReport] = useState<any>(null);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [stockLedger, setStockLedger] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [salesRes, gstRes, stockRes, ledgerRes, custRes] = await Promise.all([
        fetch('/api/reports/sales-register'),
        fetch('/api/reports/gst-summary'),
        fetch('/api/inventory/summary'),
        fetch('/api/inventory/ledger'),
        fetch('/api/customers'),
      ]);

      const sales = await salesRes.json();
      const gst = await gstRes.json();
      const stock = await stockRes.json();
      const ledger = await ledgerRes.json();
      const customers = await custRes.json();

      setSalesRegister(sales);
      setGstReport(gst);
      setStockSummary(stock);
      setStockLedger(ledger);

      // Load receivables for all customers
      const recList = [];
      for (const c of customers) {
        const rRes = await fetch(`/api/customers/${c.id}/outstanding`);
        if (rRes.ok) {
          recList.push(await rRes.json());
        }
      }
      setReceivables(recList);
    } catch (err) {
      console.error('Error fetching auditor reports:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="main-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={22} color="var(--primary)" /> Accountant & Auditor Console
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Statutory Audit Reports, GST Compliance, Stock Ledger Verification & Tally Export
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/api/reports/sales-register?format=xlsx" className="btn btn-secondary btn-sm" download>
            <Download size={13} /> Sales (.xlsx)
          </a>
          <a href="/api/reports/gst-summary?format=xlsx" className="btn btn-secondary btn-sm" download>
            <Download size={13} /> GST (.xlsx)
          </a>
          <a href="/api/reports/stock-ledger/export" className="btn btn-secondary btn-sm" download>
            <Download size={13} /> Ledger (.xlsx)
          </a>
          <a href="/api/reports/tally-xml" className="btn btn-primary btn-sm" download="tally_vouchers.xml">
            <ExternalLink size={13} /> Tally XML Export
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'SALES' ? 'active' : ''}`}
          onClick={() => setActiveTab('SALES')}
        >
          <Receipt size={14} /> Sales Register ({salesRegister.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'GST' ? 'active' : ''}`}
          onClick={() => setActiveTab('GST')}
        >
          <BookOpen size={14} /> GST Return Summary (GSTR-1 & 3B)
        </button>

        <button
          className={`tab-btn ${activeTab === 'STOCK_SUMMARY' ? 'active' : ''}`}
          onClick={() => setActiveTab('STOCK_SUMMARY')}
        >
          <Layers size={14} /> Stock Summary
        </button>

        <button
          className={`tab-btn ${activeTab === 'STOCK_LEDGER' ? 'active' : ''}`}
          onClick={() => setActiveTab('STOCK_LEDGER')}
        >
          <FileSpreadsheet size={14} /> Double-Entry Stock Ledger ({stockLedger.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'RECEIVABLES' ? 'active' : ''}`}
          onClick={() => setActiveTab('RECEIVABLES')}
        >
          <Clock size={14} /> Receivables & Ageing
        </button>
      </div>

      {/* TAB 1: Sales Register */}
      {activeTab === 'SALES' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Outward Sales Register</span>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>GSTIN</th>
                  <th>Place of Supply</th>
                  <th>Product</th>
                  <th>Taxable (₹)</th>
                  <th>CGST (₹)</th>
                  <th>SGST (₹)</th>
                  <th>IGST (₹)</th>
                  <th>Total (₹)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {salesRegister.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: 20 }}>
                      No sales recorded.
                    </td>
                  </tr>
                ) : (
                  salesRegister.map((s, idx) => (
                    <tr key={idx}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {s.invoiceNumber}
                      </td>
                      <td>{s.invoiceDate}</td>
                      <td><strong>{s.customerName}</strong></td>
                      <td className="mono">{s.customerGstin}</td>
                      <td>{s.state}</td>
                      <td>{s.productNames}</td>
                      <td>₹{s.taxableAmount.toLocaleString('en-IN')}</td>
                      <td>₹{s.cgstAmount.toFixed(2)}</td>
                      <td>₹{s.sgstAmount.toFixed(2)}</td>
                      <td>₹{s.igstAmount.toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>₹{s.totalAmount.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${s.status === 'ISSUED' ? 'badge-success' : 'badge-danger'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GST Summary (GSTR-1 & 3B) */}
      {activeTab === 'GST' && gstReport && (
        <div>
          <div className="grid-2" style={{ marginBottom: 20 }}>
            {/* GSTR-1 Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">GSTR-1 Outward Supplies Summary</span>
                <span className="badge badge-info">{gstReport.taxPeriod}</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: 13, color: '#1e3a8a' }}>Table 4: B2B Intra-State Supplies (CGST + SGST)</strong>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginTop: 4, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Invoices:</span>
                    <strong>{gstReport.gstr1.table4_b2b_intraState.count}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Taxable Value:</span>
                    <strong>₹{gstReport.gstr1.table4_b2b_intraState.taxableAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CGST (2.5%):</span>
                    <span>₹{gstReport.gstr1.table4_b2b_intraState.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SGST (2.5%):</span>
                    <span>₹{gstReport.gstr1.table4_b2b_intraState.sgstAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>
                    <span>Total Invoice Value:</span>
                    <strong style={{ color: 'var(--primary)' }}>₹{gstReport.gstr1.table4_b2b_intraState.totalInvoiceValue.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: 13, color: '#92400e' }}>Table 5: B2B Inter-State Supplies (IGST)</strong>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginTop: 4, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Invoices:</span>
                    <strong>{gstReport.gstr1.table5_b2b_interState.count}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Taxable Value:</span>
                    <strong>₹{gstReport.gstr1.table5_b2b_interState.taxableAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>IGST (5%):</span>
                    <span>₹{gstReport.gstr1.table5_b2b_interState.igstAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>
                    <span>Total Invoice Value:</span>
                    <strong style={{ color: 'var(--primary)' }}>₹{gstReport.gstr1.table5_b2b_interState.totalInvoiceValue.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* GSTR-3B Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">GSTR-3B Return Summary</span>
                <span className="badge badge-success">Auto-Mapped</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>3.1 Tax on Outward Supplies</strong>
                <table style={{ fontSize: 12, marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th>Nature of Supply</th>
                      <th>Taxable (₹)</th>
                      <th>IGST (₹)</th>
                      <th>CGST (₹)</th>
                      <th>SGST (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>(a) Outward taxable supplies</td>
                      <td>₹{gstReport.gstr3b.section3_1_outwardSupplies.taxableValue.toLocaleString('en-IN')}</td>
                      <td>₹{gstReport.gstr3b.section3_1_outwardSupplies.igst.toFixed(2)}</td>
                      <td>₹{gstReport.gstr3b.section3_1_outwardSupplies.cgst.toFixed(2)}</td>
                      <td>₹{gstReport.gstr3b.section3_1_outwardSupplies.sgst.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>4. Eligible Input Tax Credit (ITC) from Purchases</strong>
                <table style={{ fontSize: 12, marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th>Details</th>
                      <th>Taxable (₹)</th>
                      <th>IGST (₹)</th>
                      <th>CGST (₹)</th>
                      <th>SGST (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>(A) ITC Available (Purchases)</td>
                      <td>₹{gstReport.gstr3b.eligibleItc.taxableValue.toLocaleString('en-IN')}</td>
                      <td>₹{gstReport.gstr3b.eligibleItc.igst.toFixed(2)}</td>
                      <td>₹{gstReport.gstr3b.eligibleItc.cgst.toFixed(2)}</td>
                      <td>₹{gstReport.gstr3b.eligibleItc.sgst.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Table 12 HSN Summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Table 12: HSN Summary of Outward Supplies</span>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>HSN Code</th>
                    <th>Description</th>
                    <th>UQC</th>
                    <th>Total Qty</th>
                    <th>Total Taxable Value (₹)</th>
                    <th>CGST (₹)</th>
                    <th>SGST (₹)</th>
                    <th>IGST (₹)</th>
                    <th>Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {gstReport.gstr1.table12_hsnSummary.map((h: any, idx: number) => (
                    <tr key={idx}>
                      <td className="mono" style={{ fontWeight: 700 }}>{h.hsnCode}</td>
                      <td>{h.description}</td>
                      <td>{h.unit}</td>
                      <td>{h.totalQuantity}</td>
                      <td>₹{h.totalTaxable.toLocaleString('en-IN')}</td>
                      <td>₹{h.cgst.toFixed(2)}</td>
                      <td>₹{h.sgst.toFixed(2)}</td>
                      <td>₹{h.igst.toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>₹{h.totalTax.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Stock Summary */}
      {activeTab === 'STOCK_SUMMARY' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Inventory Stock Summary (Formula Reconciled)</span>
            <span className="badge badge-info">Opening + Receipts - Issues ± Adjustments = Closing</span>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Opening Bal</th>
                  <th>Receipts (+)</th>
                  <th>Issues (-)</th>
                  <th>Closing Bal</th>
                  <th>Rate (₹)</th>
                  <th>Closing Valuation (₹)</th>
                </tr>
              </thead>
              <tbody>
                {stockSummary.map((s, idx) => (
                  <tr key={idx}>
                    <td><strong>{s.itemName}</strong></td>
                    <td>
                      <span className="badge badge-secondary">{s.category}</span>
                    </td>
                    <td>{s.unit}</td>
                    <td>{s.openingBalance}</td>
                    <td style={{ color: 'var(--success)' }}>+{s.receipts}</td>
                    <td style={{ color: 'var(--danger)' }}>-{s.issues}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                      {s.closingBalance}
                    </td>
                    <td>₹{s.closingRateRupees.toFixed(2)}</td>
                    <td style={{ fontWeight: 700 }}>₹{s.totalValuationRupees.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Double-Entry Stock Ledger */}
      {activeTab === 'STOCK_LEDGER' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Complete Double-Entry Stock Ledger (Traceable Audit Trail)</span>
            <span className="badge badge-success">Immutable Logs</span>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Movement Type</th>
                  <th>Source Document</th>
                  <th>Qty Change</th>
                  <th>Balance After</th>
                  <th>Unit Rate (₹)</th>
                  <th>Valuation (₹)</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {stockLedger.map((l, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontSize: 11 }}>{l.timestamp.replace('T', ' ').substring(0, 19)}</td>
                    <td><strong>{l.itemName}</strong></td>
                    <td><span className="badge badge-secondary" style={{ fontSize: 10 }}>{l.itemCategory}</span></td>
                    <td>
                      <span
                        className={`badge ${
                          l.movementType.includes('RECEIPT') || l.movementType === 'OPENING_STOCK'
                            ? 'badge-success'
                            : l.movementType === 'SALES_DISPATCH'
                            ? 'badge-info'
                            : 'badge-warning'
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {l.movementType}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {l.referenceType} ({l.referenceNumber})
                    </td>
                    <td style={{ fontWeight: 700, color: l.quantityChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {l.quantityChange > 0 ? `+${l.quantityChange}` : l.quantityChange} {l.unit}
                    </td>
                    <td style={{ fontWeight: 700 }}>{l.balanceAfter} {l.unit}</td>
                    <td>₹{l.unitRateRupees?.toFixed(2) || '0.00'}</td>
                    <td>₹{l.totalValuationRupees?.toLocaleString('en-IN') || '0'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Receivables & Ageing */}
      {activeTab === 'RECEIVABLES' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Customer Receivables & Ageing Analysis</span>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Total Invoiced</th>
                  <th>Total Credit Notes</th>
                  <th>Total Paid</th>
                  <th>Net Outstanding (₹)</th>
                  <th>0-30 Days</th>
                  <th>31-60 Days</th>
                  <th>61-90 Days</th>
                  <th>&gt;90 Days</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((r, idx) => (
                  <tr key={idx}>
                    <td><strong>{r.customerName}</strong></td>
                    <td>₹{r.totalInvoicedRupees.toLocaleString('en-IN')}</td>
                    <td>₹{r.totalCreditNotesRupees.toLocaleString('en-IN')}</td>
                    <td>₹{r.totalPaidRupees.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 700, color: r.currentOutstandingRupees > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                      ₹{r.currentOutstandingRupees.toLocaleString('en-IN')}
                    </td>
                    <td>₹{r.ageingRupees.current0To30.toLocaleString('en-IN')}</td>
                    <td>₹{r.ageingRupees.days31To60.toLocaleString('en-IN')}</td>
                    <td>₹{r.ageingRupees.days61To90.toLocaleString('en-IN')}</td>
                    <td>₹{r.ageingRupees.daysAbove90.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
