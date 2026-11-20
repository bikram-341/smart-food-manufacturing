import React, { useState, useEffect } from 'react';
import type { Customer, Item, SalesOrder } from '../types';
import { Wifi, WifiOff, Send, Clock, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';

interface SalesmanPortalProps {
  salesmanId: string;
  salesmanName: string;
  defaultCustomerState: string;
}

export const SalesmanPortal: React.FC<SalesmanPortalProps> = ({
  salesmanId,
  salesmanName,
  defaultCustomerState,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderQuantity, setOrderQuantity] = useState<number>(150);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load master data
  const loadData = async () => {
    try {
      const [custRes, itemRes, ordRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/items'),
        fetch(`/api/orders?salesmanId=${salesmanId}`),
      ]);
      const custData = await custRes.json();
      const itemData = await itemRes.json();
      const ordData = await ordRes.json();

      setCustomers(custData);
      setItems(itemData.filter((i: Item) => i.category === 'FINISHED_GOOD'));
      setOrders(ordData);

      // Auto-select customer matching salesman state
      const matchingCust = custData.find((c: Customer) => c.stateCode === defaultCustomerState);
      if (matchingCust) {
        setSelectedCustomerId(matchingCust.id);
        if (defaultCustomerState === '29') {
          // Distributor B benchmark is 120 packets
          setOrderQuantity(120);
        } else {
          // Retailer A benchmark is 150 packets
          setOrderQuantity(150);
        }
      }
    } catch (err) {
      console.error('Error fetching salesman data:', err);
    }
  };

  useEffect(() => {
    loadData();
    // Load offline queue from localStorage
    const saved = localStorage.getItem(`offline_orders_${salesmanId}`);
    if (saved) {
      try {
        setOfflineQueue(JSON.parse(saved));
      } catch (e) {}
    }
  }, [salesmanId, defaultCustomerState]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setMessage({ type: 'error', text: 'Please select a customer.' });
      return;
    }
    const fgItem = items[0];
    if (!fgItem) return;

    const payload = {
      customerId: selectedCustomerId,
      salesmanId,
      items: [
        {
          itemId: fgItem.id,
          quantity: orderQuantity,
          unitPriceRupees: fgItem.standardRateRupees,
        },
      ],
      offlineId: isOfflineMode ? `offline_${Date.now()}` : undefined,
    };

    if (isOfflineMode) {
      const updatedQueue = [...offlineQueue, { ...payload, timestamp: new Date().toISOString() }];
      setOfflineQueue(updatedQueue);
      localStorage.setItem(`offline_orders_${salesmanId}`, JSON.stringify(updatedQueue));
      setMessage({
        type: 'success',
        text: `📶 Saved offline in queue (${updatedQueue.length} pending). Will sync when online!`,
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to place order');
      }
      setMessage({ type: 'success', text: '✅ Order submitted directly to factory billing desk!' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncOfflineOrders = async () => {
    if (offlineQueue.length === 0) return;
    setIsSubmitting(true);
    let synced = 0;
    const remaining = [...offlineQueue];

    for (const item of offlineQueue) {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          synced++;
          remaining.shift();
        }
      } catch (e) {
        break;
      }
    }

    setOfflineQueue(remaining);
    localStorage.setItem(`offline_orders_${salesmanId}`, JSON.stringify(remaining));
    setIsSubmitting(false);
    setMessage({
      type: 'success',
      text: `🔄 Successfully synced ${synced} offline orders to factory!`,
    });
    await loadData();
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const fgItem = items[0];

  return (
    <div className="mobile-wrapper">
      <div className="mobile-notch"></div>
      <div className="mobile-screen">
        {/* Mobile Header */}
        <div className="mobile-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>📱 FIELD SALESMAN APP</span>
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              style={{
                background: isOfflineMode ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: 12,
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              {isOfflineMode ? <WifiOff size={11} /> : <Wifi size={11} />}
              {isOfflineMode ? 'OFFLINE' : 'ONLINE'}
            </button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{salesmanName}</div>
        </div>

        {/* Mobile Content */}
        <div className="mobile-content">
          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ padding: '8px 12px', fontSize: 12 }}>
              {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {message.text}
            </div>
          )}

          {offlineQueue.length > 0 && (
            <div className="alert alert-warning" style={{ padding: '8px 12px', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>📦 {offlineQueue.length} orders pending sync</span>
              <button className="btn btn-primary btn-sm" onClick={handleSyncOfflineOrders} disabled={isSubmitting || isOfflineMode}>
                Sync Now
              </button>
            </div>
          )}

          {/* Quick Order Form */}
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <div className="card-header" style={{ marginBottom: 10, paddingBottom: 6 }}>
              <span className="card-title" style={{ fontSize: 14 }}>
                <ShoppingCart size={15} /> New Field Order
              </span>
              <span className="badge badge-info">&lt; 1 Min Entry</span>
            </div>

            <form onSubmit={handlePlaceOrder}>
              <div className="form-group">
                <label className="form-label">Customer (Retailer / Distributor)</label>
                <select
                  className="form-select"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  style={{ fontSize: 12 }}
                >
                  <option value="">-- Select Retailer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.stateName} - Code {c.stateCode})
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    📍 {selectedCustomer.address} | GSTIN: {selectedCustomer.gstin}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Product</label>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{fgItem ? fgItem.name : 'Murukku 200 g'}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>HSN: 19059040 | GST: 5%</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                      ₹{fgItem ? fgItem.standardRateRupees.toFixed(2) : '50.00'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>before tax</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity (Packets)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(parseInt(e.target.value, 10) || 0)}
                  style={{ fontSize: 14, fontWeight: 700 }}
                />
              </div>

              {/* Order Math Summary */}
              <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>Taxable Value:</span>
                  <strong>₹{((fgItem?.standardRateRupees || 50) * orderQuantity).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 11 }}>
                  <span>Est. GST (5%):</span>
                  <span>₹{(((fgItem?.standardRateRupees || 50) * orderQuantity * 0.05)).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4, fontWeight: 700 }}>
                  <span>Est. Total:</span>
                  <span style={{ color: 'var(--primary)' }}>
                    ₹{(((fgItem?.standardRateRupees || 50) * orderQuantity * 1.05)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                disabled={isSubmitting}
              >
                <Send size={14} />
                {isSubmitting ? 'Sending...' : isOfflineMode ? 'Save to Offline Queue' : 'Submit Direct to Factory'}
              </button>
            </form>
          </div>

          {/* Orders History & Status */}
          <div className="card" style={{ padding: 14 }}>
            <div className="card-header" style={{ marginBottom: 10, paddingBottom: 6 }}>
              <span className="card-title" style={{ fontSize: 13 }}>
                <Clock size={14} /> My Orders & Status ({orders.length})
              </span>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>
                No orders submitted yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ color: 'var(--primary)' }}>{ord.orderNumber}</strong>
                      <span
                        className={`badge ${
                          ord.status === 'DISPATCHED'
                            ? 'badge-success'
                            : ord.status === 'INVOICED'
                            ? 'badge-info'
                            : ord.status === 'APPROVED'
                            ? 'badge-warning'
                            : 'badge-secondary'
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <div style={{ color: '#334155', fontWeight: 600 }}>{ord.customerName}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                      <span>{ord.items[0]?.quantity || 0} packets</span>
                      <strong>₹{ord.totalTaxableRupees.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
