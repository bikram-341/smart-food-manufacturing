# Video Demo Walkthrough Script (Section 5 Benchmark Scenario)
**System:** Order-to-Audit Food Manufacturing Prototype  
**Duration:** Under 8 minutes  
**Evaluator Reference:** Centre for Digital Infrastructure, NIT Tiruchirappalli

---

## Pre-Requisites & Initial Setup
1. Launch the application:
   ```bash
   npm start
   # Or in development mode:
   npm run dev
   ```
2. Open `http://localhost:3000` in the browser.
3. Click **"Reset"** in the top navigation bar to ensure the system is at the exact clean Section 5 master opening stock state:
   - Flour: 100 kg (@ ₹42)
   - Oil: 30 L (@ ₹140)
   - Spice mix: 5 kg (@ ₹200)
   - Pouches: 500 pcs (@ ₹2.50)
   - Cartons: 30 pcs (@ ₹15)
   - Finished Murukku 200g: 50 packets (@ ₹50)

---

## Step-by-Step Scenario Walkthrough

### ⏱️ Minute 0:00 - 0:45 | Overview & Architecture
- Welcome the viewer. Introduce *Sri Krishna Foods Pvt Ltd*, a South Indian snack manufacturer in Tamil Nadu.
- Highlight the core capability: linking the **Sales Loop** and the **Production Loop** at finished-goods inventory with a real double-entry stock ledger, integer-paisa financial precision, and role-based access control.

---

### ⏱️ Minute 0:45 - 1:45 | Step 1: Raw Material Purchase
- Switch to **Factory Admin** view.
- Record a purchase from *Tamil Agro Traders* (Tamil Nadu):
  - **Item:** Flour
  - **Quantity:** 60 kg @ ₹45/kg
  - **Invoice No:** `SUP-INV-2026-089`
- Show the stock ledger: Flour balance increases from 100 kg to **160 kg** (100 opening + 60 purchase).
- Mention that a new stock lot is created for FIFO / Weighted Average tracking.

---

### ⏱️ Minute 1:45 - 3:30 | Steps 2, 3 & 8: Recipe-based BOM Production Run & Costing
- Switch to **Production Floor** view ( Murugan's console).
- Show the **Tamil language toggle** (தமிழ் / English) for floor operators.
- Review the Murukku 200g recipe BOM (1 batch = 200 packets expected from 40 kg flour).
- Fill in the production run inputs:
  - Flour issued: **40 kg**
  - Cooking oil issued: **10.5 L** (Point out the real-time **+5% Oil Consumption Variance Alert**!)
  - Spice mix issued: **1.2 kg**
  - Good output produced: **188 packets** (Point out the **-6% Yield Variance Alert**!)
  - Damaged pouches: **6 pouches** (sealing spike)
  - Cartons used: **9 cartons**
  - Direct Labour: **₹1,200**
  - Power / Gas overheads: **₹600**
- Click **"Post Production Run"**.
- Demonstrate the automated results:
  - Raw materials automatically deducted: Flour becomes **120 kg** (160 - 40), Oil becomes **19.5 L** (30 - 10.5), Pouches become **306** (500 - 188 - 6).
  - Finished goods inventory immediately increases: 50 opening + 188 produced = **238 packets**!
  - Costing breakdown: Total direct materials ₹4,010 + Overheads ₹1,800 = ₹5,810.
  - Cost per packet = **₹30.90**! Gross profit margin against ₹50 selling price = **₹19.10 (38.2%)**.

---

### ⏱️ Minute 3:30 - 4:45 | Steps 4 & 5: Field Sales Order, GST Invoice & Dispatch
- Switch to **Salesman A (TN)** mobile view on the left.
- Demonstrate fast order entry (&lt; 1 minute):
  - Customer: *Retailer A (Tamil Nadu)*
  - Product: Murukku 200 g
  - Quantity: **150 packets** @ ₹50.00
  - Taxable value: ₹7,500.00
- Mention offline capability: salesman can capture orders even with zero network and sync when back online.
- Click **"Submit Direct to Factory"**.
- Switch to **Factory Admin** view:
  - Admin sees order `SO-2026-0001`. Stock check shows green: "In Stock (238 available)".
  - Admin clicks **"Approve"**.
  - Admin clicks **"Raise GST Invoice"**: Because customer is in Tamil Nadu (33), system computes Intra-state GST: **₹187.50 CGST (2.5%)** + **₹187.50 SGST (2.5%)** = **₹7,875.00 Grand Total**.
  - Click **"PDF"**: Show the professional, GSTIN-compliant tax invoice PDF generated on the fly.
  - Admin clicks **"Dispatch Goods"**: Finished goods stock is immediately decremented from 238 to **88 packets**!

---

### ⏱️ Minute 4:45 - 5:45 | Step 6: Salesman B Inter-State Order & Shortage Handling
- Switch to **Salesman B (KA)** mobile view.
- Place order for *Distributor B (Karnataka)*:
  - Product: Murukku 200 g
  - Quantity: **120 packets**
- Switch to **Factory Admin** view:
  - The system highlights the shortage in red: **"Shortage: 32 pkts"** (88 in stock vs 120 requested).
  - Highlight that because Distributor B is in Karnataka (29), **IGST at 5%** applies instead of CGST/SGST.

---

### ⏱️ Minute 5:45 - 6:30 | Step 7: Payment Collection & Customer Outstanding
- In **Factory Admin** desk, record a collection payment:
  - Customer: *Retailer A*
  - Amount: **₹4,000.00** via NEFT
- Show customer ledger:
  - Invoiced: ₹7,875.00
  - Paid: ₹4,000.00
  - Current Net Outstanding: **₹3,875.00** (matches benchmark check!).

---

### ⏱️ Minute 6:30 - 7:30 | Step 9: Auditor Reports & Exports
- Switch to **Auditor / Reports** console.
- Walk through the statutory views:
  1. **Sales Register:** Date, customer, HSN, taxable value, CGST, SGST, IGST.
  2. **GSTR-1 & GSTR-3B Return Summary:** Table 4 Intra-state, Table 5 Inter-state, Table 12 HSN aggregation.
  3. **Stock Summary:** Formula-reconciled: Opening (100) + Receipts (60) - Issues (40) = 120 kg closing.
  4. **Double-Entry Stock Ledger:** Complete traceable movement history linking each entry to its purchase, production run, or invoice document.
  5. **Customer Receivables & Ageing:** 0-30 days ageing buckets.
- Click **"Tally XML Export"** and show the generated XML ready for TallyPrime import.

---

### ⏱️ Minute 7:30 - 8:00 | Benchmark Suite 1-Click Verification & Conclusion
- Switch to **Benchmark Suite** tab.
- Click **"Run Benchmark Scenario"**.
- Show the live execution: all 11 checks pass with green checkmarks matching Section 5 with 100% precision.
- Conclude the presentation.
