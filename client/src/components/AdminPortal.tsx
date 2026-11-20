import React, { useState, useEffect } from 'react';
import type { SalesOrder, Invoice, Customer } from '../types';
import {
  FileText,
  Truck,
  CheckCircle,
  AlertTriangle,
  Download,
  CreditCard,
  Ban,
  PackageCheck,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockCheckMap, setStockCheckMap] = useState<Record<string, any>>({});
  const [paymentCustomerId, setPaymentCustomerId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(4000);
  const [paymentMode, setPaymentMode] = useState<string>('NEFT');
  const [customerOutstanding, setCustomerOutstanding] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [ordRes, invRes, custRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/invoices'),
        fetch('/api/customers'),
      ]);
      const ords = await ordRes.json();
      const invs = await invRes.json();
      const custs = await custRes.json();

      setOrders(ords);
      setInvoices(invs);
      setCustomers(custs);

      // Perform stock check for all submitted/approved orders
      const checkMap: Record<string, any> = {};
      for (const ord of ords) {
        if (ord.status === 'SUBMITTED' || ord.status === 'APPROVED') {
          const res = await fetch(`/api/orders/${ord.id}/stock-check`);
          if (res.ok) {
            checkMap[ord.id] = await res.json();
          }
        }
      }
      setStockCheckMap(checkMap);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (orderId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: 'usr_admin' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage({ type: 'success', text: 'Order approved successfully.' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (orderId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: 'usr_admin', reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage({ type: 'success', text: 'Order rejected.' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (orderId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, adminUserId: 'usr_admin', financialYear: '2026-27' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const inv = await res.json();
      setMessage({
        type: 'success',
        text: `GST Tax Invoice raised: ${inv.invoiceNumber} | Total: ₹${inv.grandTotal.rupees || inv.grandTotal}`,
      });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (orderId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: 'usr_admin', transportMode: 'Factory Van', vehicleNumber: 'TN-45-AK-1234' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage({ type: 'success', text: 'Goods dispatched! Finished-goods inventory reduced in stock ledger.' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    const reason = prompt('Enter reason for cancellation (Credit Note will be issued):');
    if (!reason) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: 'usr_admin', reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setMessage({
        type: 'success',
        text: `Invoice cancelled. Credit Note ${data.creditNote.creditNoteNumber} issued!`,
      });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomerId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: paymentCustomerId,
          amountRupees: paymentAmount,
          paymentMode,
          referenceNumber: `REF-${Date.now().toString().slice(-6)}`,
          notes: 'Customer collection recorded at billing desk',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage({ type: 'success', text: `Payment of ₹${paymentAmount} recorded successfully!` });
      await checkOutstanding(paymentCustomerId);
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const checkOutstanding = async (customerId: string) => {
    setPaymentCustomerId(customerId);
    try {
      const res = await fetch(`/api/customers/${customerId}/outstanding`);
      if (res.ok) {
        setCustomerOutstanding(await res.json());
      }
    } catch (e) {}
  };

  return (
    <div className="main-container">
      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {message.text}
        </div>
      )}

      {/* Grid: Incoming Orders & Billing Actions */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <span className="card-title">
              <PackageCheck size={18} /> Incoming Sales Orders ({orders.length})
            </span>
            <span className="badge badge-info">Desk Verification</span>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>State</th>
                  <th>Qty (Pkts)</th>
                  <th>Stock Coverage</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const check = stockCheckMap[ord.id];
                  const hasShortage = check && !check.isFullyCovered;

                  return (
                    <tr key={ord.id}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {ord.orderNumber}
                      </td>
                      <td>
                        <strong>{ord.customerName}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>via {ord.salesmanName}</div>
                      </td>
                      <td>
                        <span className={`badge ${ord.customerStateCode === '33' ? 'badge-info' : 'badge-warning'}`}>
                          {ord.customerStateCode === '33' ? 'Intra-State (TN 33)' : 'Inter-State (KA 29)'}
                        </span>
                      </td>
                      <td>
                        <strong>{ord.items[0]?.quantity}</strong> pkts
                      </td>
                      <td>
                        {check ? (
                          hasShortage ? (
                            <span
                              className="badge badge-danger"
                              title={`Short by ${check.totalShortagePackets} packets! In stock: ${check.items[0]?.availableQty}`}
                            >
                              <AlertTriangle size={12} /> Shortage: {check.totalShortagePackets} pkts
                            </span>
                          ) : (
                            <span className="badge badge-success">
                              <CheckCircle size={12} /> In Stock ({check.items[0]?.availableQty})
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>N/A</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            ord.status === 'DISPATCHED'
                              ? 'badge-success'
                              : ord.status === 'INVOICED'
                              ? 'badge-info'
                              : ord.status === 'APPROVED'
                              ? 'badge-warning'
                              : ord.status === 'REJECTED'
                              ? 'badge-danger'
                              : 'badge-secondary'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {ord.status === 'SUBMITTED' && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleApprove(ord.id)}
                                disabled={loading}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleReject(ord.id)}
                                disabled={loading}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {ord.status === 'APPROVED' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleGenerateInvoice(ord.id)}
                              disabled={loading}
                            >
                              <FileText size={12} /> Raise GST Invoice
                            </button>
                          )}

                          {ord.status === 'INVOICED' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleDispatch(ord.id)}
                              disabled={loading}
                            >
                              <Truck size={12} /> Dispatch Goods
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Payment & Outstanding Balance Widget */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <CreditCard size={18} /> Record Collection
            </span>
          </div>

          <form onSubmit={handleRecordPayment}>
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select
                className="form-select"
                value={paymentCustomerId}
                onChange={(e) => checkOutstanding(e.target.value)}
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {customerOutstanding && (
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Receivables:</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                  ₹{customerOutstanding.currentOutstandingRupees.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Invoiced: ₹{customerOutstanding.totalInvoicedRupees} | Paid: ₹{customerOutstanding.totalPaidRupees}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select className="form-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="NEFT">NEFT / RTGS</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <button type="submit" className="btn btn-success" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              Record Customer Payment
            </button>
          </form>
        </div>
      </div>

      {/* Raised Invoices Table & Audit Actions */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <FileText size={18} /> GST Tax Invoices & Dispatches ({invoices.length})
          </span>
          <span className="badge badge-success">Financial Year 2026-27</span>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Recipient</th>
                <th>Supply Type</th>
                <th>Taxable (₹)</th>
                <th>CGST (₹)</th>
                <th>SGST (₹)</th>
                <th>IGST (₹)</th>
                <th>Total (₹)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                    No GST invoices raised yet. Approve an order to generate tax invoices.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {inv.invoiceNumber}
                    </td>
                    <td>{inv.invoiceDate.split('T')[0]}</td>
                    <td>
                      <strong>{inv.customerName}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>GSTIN: {inv.customerGstin}</div>
                    </td>
                    <td>
                      <span className={`badge ${inv.isInterState ? 'badge-warning' : 'badge-info'}`}>
                        {inv.isInterState ? 'Inter-State (IGST 5%)' : 'Intra-State (CGST 2.5% + SGST 2.5%)'}
                      </span>
                    </td>
                    <td>₹{inv.totalTaxableRupees.toLocaleString('en-IN')}</td>
                    <td>₹{inv.totalCgstRupees.toFixed(2)}</td>
                    <td>₹{inv.totalSgstRupees.toFixed(2)}</td>
                    <td>₹{inv.totalIgstRupees.toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      ₹{inv.grandTotalRupees.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${inv.status === 'ISSUED' ? 'badge-success' : 'badge-danger'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          <Download size={12} /> PDF
                        </a>

                        {inv.status === 'ISSUED' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelInvoice(inv.id)}
                            title="Cancel invoice with Credit Note"
                          >
                            <Ban size={12} /> Cancel (CN)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
