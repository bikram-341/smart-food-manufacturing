import React, { useState, useEffect } from 'react';
import { PieChart, TrendingUp, AlertCircle, Package, DollarSign, Layers } from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/reports/dashboard')
      .then((res) => res.json())
      .then((data) => {
        setDashboard(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching dashboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !dashboard) {
    return <div className="main-container" style={{ textAlign: 'center', padding: 40 }}>Loading executive dashboard...</div>;
  }

  const { kpis, stockSummary, recentRuns } = dashboard;
  const sellingPrice = 50.0;
  const costPerPacket = kpis.latestCostPerPacket || 30.9;
  const marginPerPacket = sellingPrice - costPerPacket;
  const marginPercent = ((marginPerPacket / sellingPrice) * 100).toFixed(1);

  return (
    <div className="main-container">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChart size={22} color="var(--primary)" /> Factory Owner Executive Dashboard
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Real-time summary of sales, production variances, cost per packet, stock levels, and outstanding receivables
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <span>Total Sales Revenue</span>
            <DollarSign size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>
            ₹{kpis.totalRevenueRupees.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>GST Invoiced Supplies</div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <span>Outstanding Receivables</span>
            <TrendingUp size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', marginTop: 8 }}>
            ₹{kpis.totalReceivablesRupees.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Customer Pending Balance</div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <span>Cost / Packet (Murukku)</span>
            <Package size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)', marginTop: 8 }}>
            ₹{costPerPacket.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
            Margin: ₹{marginPerPacket.toFixed(2)} ({marginPercent}%) @ ₹50
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <span>Variance Alerts</span>
            <AlertCircle size={16} color="var(--danger)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)', marginTop: 8 }}>
            {kpis.varianceAlertsCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Flagged beyond 3% tolerance</div>
        </div>
      </div>

      {/* Stock Balances Summary */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">
            <Layers size={18} /> Always-Current Stock Balances (Reconciled against Ledger)
          </span>
          <span className="badge badge-success">Live Reconciled</span>
        </div>

        <div className="grid-3">
          {stockSummary.map((item: any) => (
            <div
              key={item.itemId}
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: 14 }}>{item.itemName}</strong>
                <span className="badge badge-secondary" style={{ fontSize: 10 }}>{item.category}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)', margin: '6px 0' }}>
                {item.closingBalance} <span style={{ fontSize: 13, fontWeight: 500 }}>{item.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Rate: ₹{item.closingRateRupees.toFixed(2)}</span>
                <strong>Valuation: ₹{item.totalValuationRupees.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Production Batches */}
      {recentRuns && recentRuns.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Production Batches & Margin Performance</span>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Product</th>
                  <th>Output (Pkts)</th>
                  <th>Yield Variance</th>
                  <th>Total Cost (₹)</th>
                  <th>Cost / Pkt</th>
                  <th>Selling Price</th>
                  <th>Gross Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((r: any) => {
                  const unitCost = r.costPerPacketRupees || (r.costPerPacket?.rupees ?? 30.9);
                  const margin = 50 - unitCost;
                  const pct = ((margin / 50) * 100).toFixed(1);

                  return (
                    <tr key={r.id}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {r.runNumber}
                      </td>
                      <td>{r.productName}</td>
                      <td><strong>{r.actualOutputPackets}</strong> pkts</td>
                      <td>
                        <span className={`badge ${r.isYieldAlert ? 'badge-danger' : 'badge-success'}`}>
                          {r.yieldVariancePercent}% {r.isYieldAlert ? 'FLAGGED' : ''}
                        </span>
                      </td>
                      <td>₹{r.totalManufacturingCostRupees?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{unitCost.toFixed(2)}</td>
                      <td>₹50.00</td>
                      <td>
                        <span className="badge badge-success">
                          ₹{margin.toFixed(2)} / pkt ({pct}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
