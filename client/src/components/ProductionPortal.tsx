import React, { useState, useEffect } from 'react';
import type { ProductionRun, Item } from '../types';
import { Factory, Calculator, History, Languages } from 'lucide-react';

export const ProductionPortal: React.FC = () => {
  const [, setBoms] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [isTamil, setIsTamil] = useState<boolean>(false);

  // Form State initialized to Benchmark values
  const [flourIssued, setFlourIssued] = useState<number>(40);
  const [oilIssued, setOilIssued] = useState<number>(10.5);
  const [spiceIssued, setSpiceIssued] = useState<number>(1.2);
  const [actualGoodPackets, setActualGoodPackets] = useState<number>(188);
  const [damagedPouches, setDamagedPouches] = useState<number>(6);
  const [cartonsUsed, setCartonsUsed] = useState<number>(9);
  const [labourCost, setLabourCost] = useState<number>(1200);
  const [overheadCost, setOverheadCost] = useState<number>(600);
  const [valuationMethod, setValuationMethod] = useState<'FIFO' | 'WEIGHTED_AVERAGE' | 'LAST_PRICE'>('FIFO');

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const t = {
    title: isTamil ? 'உற்பத்தி மற்றும் சமையல் குறிப்பு (BOM)' : 'Production Floor & Recipe (BOM)',
    subtitle: isTamil ? 'தொழிற்சாலை ஊழியர்கள் மற்றும் மேற்பார்வையாளர் முகப்பு' : 'Factory Floor Staff & Supervisor Console',
    langToggle: isTamil ? 'English' : 'தமிழ் இடைமுகம்',
    newRunTitle: isTamil ? 'புதிய உற்பத்தி பதிவு (Daily Production Run)' : 'Log Daily Production Run',
    standardBomTitle: isTamil ? 'நிலையான செய்முறை (Murukku 200g BOM)' : 'Standard Murukku 200g Recipe (BOM)',
    expectedYield: isTamil ? 'எதிர்பார்க்கப்படும் உற்பத்தி: 200 பாக்கெட்டுகள்' : 'Expected Output: 200 packets per batch',
    flour: isTamil ? 'மாவு (Flour) - கிலோ' : 'Flour (kg)',
    oil: isTamil ? 'எண்ணெய் (Cooking Oil) - லிட்டர்' : 'Cooking Oil (litres)',
    spice: isTamil ? 'மசாலா மற்றும் உப்பு (Spice Mix) - கிலோ' : 'Salt & Spice Mix (kg)',
    goodPackets: isTamil ? 'உற்பத்தி செய்யப்பட்ட நல்ல பாக்கெட்டுகள்' : 'Actual Good Packets Produced',
    damagedPouches: isTamil ? 'சேதமடைந்த பவுச்சுகள் (Damaged Pouches)' : 'Damaged / Scrap Pouches',
    cartons: isTamil ? 'பயன்படுத்தப்பட்ட அட்டைப்பெட்டிகள் (Cartons)' : 'Cartons Used (holds 20 pkts)',
    labour: isTamil ? 'கூலி / மனித உழைப்புச் செலவு (₹)' : 'Direct Labour Cost (₹)',
    overheads: isTamil ? 'மின்சாரம் / எரிவாயு இதர செலவுகள் (₹)' : 'Power & Gas Overheads (₹)',
    saveRun: isTamil ? 'உற்பத்தியைப் பதிவு செய் (சரக்கு தானாக மாறும்)' : 'Post Production Run (Auto-updates Stock)',
    historyTitle: isTamil ? 'முந்தைய உற்பத்திப் பதிவுகள்' : 'Production Runs & Costing History',
    yieldVar: isTamil ? 'உற்பத்தி மாறுபாடு (Yield Variance)' : 'Yield Variance',
    oilVar: isTamil ? 'எண்ணெய் மாறுபாடு (Oil Variance)' : 'Oil Variance',
    costPerPkt: isTamil ? 'ஒரு பாக்கெட் விலை (Cost/Pkt)' : 'Cost Per Packet',
    grossMargin: isTamil ? 'லாப வரம்பு (Margin @ ₹50)' : 'Gross Margin (@ ₹50)',
  };

  const loadData = async () => {
    try {
      const [bomRes, itemRes, runRes] = await Promise.all([
        fetch('/api/boms'),
        fetch('/api/items'),
        fetch('/api/production/runs'),
      ]);
      setBoms(await bomRes.json());
      setItems(await itemRes.json());
      setRuns(await runRes.json());
    } catch (err) {
      console.error('Error fetching production data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time variance calculations
  const plannedOutput = 200;
  const yieldVariance = Math.round(((actualGoodPackets - plannedOutput) / plannedOutput) * 100);
  const isYieldAlert = Math.abs(yieldVariance) > 3;

  const plannedOil = 10.0;
  const oilVariance = Math.round(((oilIssued - plannedOil) / plannedOil) * 100);
  const isOilAlert = Math.abs(oilVariance) > 3;

  const handleRecordRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const fgItem = items.find((i) => i.category === 'FINISHED_GOOD');
    const flourItem = items.find((i) => i.sku === 'RM-FLOUR-01');
    const oilItem = items.find((i) => i.sku === 'RM-OIL-01');
    const spiceItem = items.find((i) => i.sku === 'RM-SPICE-01');
    const pouchItem = items.find((i) => i.sku === 'PM-POUCH-200G');

    if (!fgItem || !flourItem || !oilItem || !spiceItem || !pouchItem) {
      setMessage({ type: 'error', text: 'Master data items not found.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        productId: fgItem.id,
        supervisorUserId: 'usr_prod',
        actualGoodPackets,
        issuedIngredients: [
          { itemId: flourItem.id, actualQuantity: flourIssued },
          { itemId: oilItem.id, actualQuantity: oilIssued },
          { itemId: spiceItem.id, actualQuantity: spiceIssued },
        ],
        damagedPackaging: [
          { itemId: pouchItem.id, quantity: damagedPouches, reason: 'Pouch sealing error' },
        ],
        cartonsUsed,
        labourCostRupees: labourCost,
        overheadCostRupees: overheadCost,
        valuationMethod,
        notes: `Production run by Murugan (${valuationMethod})`,
      };

      const res = await fetch('/api/production/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record run');
      }

      const run = await res.json();
      setMessage({
        type: 'success',
        text: `✅ Production Run ${run.runNumber} recorded! Finished goods increased by ${actualGoodPackets} pkts. Raw materials deducted. Cost per packet: ₹${run.costPerPacketRupees.toFixed(2)}`,
      });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Factory size={22} color="var(--primary)" /> {t.title}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.subtitle}</p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setIsTamil(!isTamil)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Languages size={16} /> {t.langToggle}
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {message.text}
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 24 }}>
        {/* Standard Recipe Box */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Calculator size={16} /> {t.standardBomTitle}
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{t.expectedYield}</p>

          <table style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Standard Qty</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Flour</td>
                <td>40</td>
                <td>kg</td>
              </tr>
              <tr>
                <td>Cooking oil</td>
                <td>10</td>
                <td>litre</td>
              </tr>
              <tr>
                <td>Salt & spice mix</td>
                <td>1.2</td>
                <td>kg</td>
              </tr>
              <tr>
                <td>200 g pouch</td>
                <td>200</td>
                <td>piece</td>
              </tr>
              <tr>
                <td>Carton (20 pkts)</td>
                <td>10</td>
                <td>piece</td>
              </tr>
            </tbody>
          </table>

          <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, marginTop: 14, fontSize: 12, color: '#1e40af' }}>
            ℹ️ Tolerance Threshold: <strong>3.0%</strong>. Any consumption or yield variance above 3% triggers visual alerts.
          </div>
        </div>

        {/* Production Run Entry Form */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <span className="card-title">{t.newRunTitle}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Valuation:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                value={valuationMethod}
                onChange={(e: any) => setValuationMethod(e.target.value)}
              >
                <option value="FIFO">FIFO (First-In, First-Out)</option>
                <option value="WEIGHTED_AVERAGE">Weighted Average Rate</option>
                <option value="LAST_PRICE">Last Purchase Rate</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleRecordRun}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">{t.flour}</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={flourIssued}
                  onChange={(e) => setFlourIssued(parseFloat(e.target.value) || 0)}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Standard: 40 kg</span>
              </div>

              <div className="form-group">
                <label className="form-label">{t.oil}</label>
                <input
                  type="number"
                  step="0.1"
                  className={`form-input ${isOilAlert ? 'border-danger' : ''}`}
                  value={oilIssued}
                  onChange={(e) => setOilIssued(parseFloat(e.target.value) || 0)}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Standard: 10.0 L</span>
                  <span className={`badge ${isOilAlert ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: 10 }}>
                    {oilVariance > 0 ? `+${oilVariance}%` : `${oilVariance}%`} {isOilAlert ? 'ALERT' : ''}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t.spice}</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={spiceIssued}
                  onChange={(e) => setSpiceIssued(parseFloat(e.target.value) || 0)}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Standard: 1.2 kg</span>
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">{t.goodPackets}</label>
                <input
                  type="number"
                  className={`form-input ${isYieldAlert ? 'border-danger' : ''}`}
                  value={actualGoodPackets}
                  onChange={(e) => setActualGoodPackets(parseInt(e.target.value, 10) || 0)}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Planned: 200 pkts</span>
                  <span className={`badge ${isYieldAlert ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: 10 }}>
                    {yieldVariance}% {isYieldAlert ? 'FLAGGED' : ''}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t.damagedPouches}</label>
                <input
                  type="number"
                  className="form-input"
                  value={damagedPouches}
                  onChange={(e) => setDamagedPouches(parseInt(e.target.value, 10) || 0)}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rate: ₹2.50/pouch</span>
              </div>

              <div className="form-group">
                <label className="form-label">{t.cartons}</label>
                <input
                  type="number"
                  className="form-input"
                  value={cartonsUsed}
                  onChange={(e) => setCartonsUsed(parseInt(e.target.value, 10) || 0)}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rate: ₹15.00/carton</span>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t.labour}</label>
                <input
                  type="number"
                  className="form-input"
                  value={labourCost}
                  onChange={(e) => setLabourCost(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.overheads}</label>
                <input
                  type="number"
                  className="form-input"
                  value={overheadCost}
                  onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              disabled={loading}
            >
              {t.saveRun}
            </button>
          </form>
        </div>
      </div>

      {/* Production History & Costing */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <History size={18} /> {t.historyTitle} ({runs.length})
          </span>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Run #</th>
                <th>Product</th>
                <th>Actual Output</th>
                <th>Yield Variance</th>
                <th>Materials (₹)</th>
                <th>Labour + Overheads (₹)</th>
                <th>Total Cost (₹)</th>
                <th>Cost / Packet</th>
                <th>Gross Margin (@ ₹50)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                    No production runs recorded yet.
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const marginPerPkt = 50 - r.costPerPacketRupees;
                  const marginPercent = ((marginPerPkt / 50) * 100).toFixed(1);

                  return (
                    <tr key={r.id}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {r.runNumber}
                      </td>
                      <td>
                        <strong>{r.productName}</strong>
                      </td>
                      <td>
                        <strong>{r.actualOutputPackets}</strong> pkts
                      </td>
                      <td>
                        <span className={`badge ${r.isYieldAlert ? 'badge-danger' : 'badge-success'}`}>
                          {r.yieldVariancePercent}% {r.isYieldAlert ? 'FLAGGED' : ''}
                        </span>
                      </td>
                      <td>₹{r.materialsCostRupees.toLocaleString('en-IN')}</td>
                      <td>₹{(r.labourCostRupees + r.overheadCostRupees).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>₹{r.totalManufacturingCostRupees.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{r.costPerPacketRupees.toFixed(2)}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          ₹{marginPerPkt.toFixed(2)} ({marginPercent}%)
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success">{r.status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
