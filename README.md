# Order-to-Audit System for a Small Food Manufacturer
**Centre for Digital Infrastructure, NIT Tiruchirappalli — Winter Internship Technical Assessment**

[![Build & Test](https://img.shields.io/badge/tests-11%2F11%20passing-brightgreen)](#)
[![Benchmark](https://img.shields.io/badge/benchmark%20checks-11%2F11%20passed-success)](#)
[![TypeScript](https://img.shields.io/badge/typescript-v5.3%2B-blue)](#)
[![Architecture](https://img.shields.io/badge/architecture-Clean%20%2F%20SOLID%20%2F%20LLD-orange)](#)

A complete, production-grade Order-to-Audit system built for a packaged South Indian snack manufacturer (*Sri Krishna Foods Pvt Ltd*, Tamil Nadu). The system links the **Sales Loop** and the **Production Loop** at the finished-goods nexus with a double-entry inventory ledger, zero-float integer-paisa financial precision, recipe-based BOM variance tracking, GST compliance (CGST/SGST vs IGST), and role-based access control.

---

## 1. Quick Start / How to Run Locally

You can run the entire application using a single command:

### Option A: Standard Node.js Run
```bash
# 1. Install dependencies
npm install
npm --prefix client install

# 2. Build frontend and backend
npm run build

# 3. Start the application (Single unified server on Port 3000)
npm start
```
Open your browser at **`http://localhost:3000`**.

### Option B: Development Mode (Hot-Reload)
```bash
# Runs backend tsx server watch
npm run dev
```

### Option C: Docker (1-Command Containerized Run)
```bash
docker compose up --build
```
Access at `http://localhost:3000`.

---

## 2. Test User Logins & Role Switcher

The application provides an instantaneous 1-click **Role Switcher** in the top navigation bar to test each role's perspective:

| Role | Test Username | Device / Perspective | Key Actions |
|---|---|---|---|
| **Salesman A** | `salesman_a` | Mobile View (Tamil Nadu) | Fast order entry (&lt; 1 min), offline queue, status tracking |
| **Salesman B** | `salesman_b` | Mobile View (Karnataka) | Inter-state orders, shortage alert demonstration |
| **Factory Admin** | `admin` | Desktop Console | Order verification, stock coverage checks, GST invoices, PDF download, dispatch, payments |
| **Production Floor** | `production` | Tablet / Floor Console | BOM recipe execution, planned vs actual variance alerts, scrap, Tamil/English interface |
| **Auditor / CA** | `auditor` | Desktop (Read-Only) | Sales register, GSTR-1 & 3B, stock ledger, ageing, Excel/Tally exports |
| **Factory Owner** | `owner` | Any Device | Executive KPI cards, real-time balances, batch profitability |
| **Benchmark Suite** | *Evaluator* | Automated Test Tab | 1-Click execution and verification of the 9-step scenario |

---

## 3. Technology Stack & Justification

- **Language:** TypeScript 5 (Strict Mode) across the full stack. Eliminates runtime type errors, provides compile-time contract enforcement, and enables type-safe value objects.
- **Backend Framework:** Node.js & Express 5. Lightweight, highly performant, and runs universally on any environment.
- **Database Engine:** Relational SQLite via `better-sqlite3` with Write-Ahead Logging (`WAL`) and strict foreign key constraints (`PRAGMA foreign_keys = ON`). Self-contained, zero external server dependencies, ensures ACID transactions, and persists data reliably without Docker overhead.
- **Frontend:** React 19 + Vite + Lucide Icons. Ultra-fast HMR, sub-second builds, responsive mobile device mockup frames for field salesmen, and accessible floor staff interfaces.
- **Arithmetic Engine:** Integer-paisa arithmetic (`Money` value object) avoiding JavaScript floating-point errors (e.g. `0.1 + 0.2`).
- **Reporting & Export Engines:** `pdfkit` for GST tax invoices, `xlsx` for Excel/CSV audit registers, and custom Tally XML generator for TallyPrime voucher import.
- **Test Runner:** `vitest` with 11 automated unit and integration tests executing in &lt; 500ms.

---

## 4. Features Built Against Section 6 Tiers

### ✅ Must-Have (100% Completed)
- [x] **Role-Based Access Control (RBAC):** Distinct interfaces for Salesman, Admin, Production Floor, Auditor, and Owner.
- [x] **Master Data:** Items, Customers, Suppliers, and Bill of Materials (BOM).
- [x] **Mobile-Friendly Field Order Taking:** Salesman can place orders in under 60 seconds with product prices from master list.
- [x] **Admin Verification & Stock Check:** Real-time stock coverage indicator (Green = in stock, Red = shortage with exact deficit).
- [x] **GST Tax Invoice as PDF:** Financial-year sequential numbering (`INV/2026-27/0001`), GSTINs, HSN codes, and downloadable PDF with tax breakdown.
- [x] **Recipe-Based Production Run:** Automatically deducts raw materials and increases finished goods in the stock ledger.
- [x] **Variance Detection Engine:** Real-time planned vs. actual consumption and yield comparison with visual alerts (> 3% tolerance).
- [x] **Double-Entry Stock Ledger:** Formula-based reconciliation: `Opening + Receipts - Issues ± Adjustments = Closing`.
- [x] **Statutory Reports:** Sales register, stock summary, and stock ledger exportable to Excel (`.xlsx`).

### ✅ Should-Have (100% Completed)
- [x] **Purchases & Supplier Records:** Purchase orders, supplier invoices, input tax credit (ITC), and automatic stock receipt logging.
- [x] **Payments, Outstanding & Ageing:** Customer payment tracking with 0-30, 31-60, 61-90, and >90 days ageing buckets.
- [x] **Cost Per Packet with Overheads:** Allocates direct materials + labour (₹1,200) + power/gas (₹600) with gross margin against ₹50 selling price.
- [x] **GST Return Summary:** Automatically formatted to map into GSTR-1 (Table 4 Intra-state, Table 5 Inter-state, Table 12 HSN Summary) and GSTR-3B (Section 3.1 & Section 4 ITC).
- [x] **Variance Alerts beyond Tolerance:** Visual warnings when consumption or yield deviates by more than 3%.
- [x] **Owner Executive Dashboard:** KPI cards for revenue, outstanding receivables, batch margins, and inventory health.

### 🌟 Stretch Goals (Completed)
- [x] **Offline Order Capture with Local Queue & Sync:** Salesmen on weak rural networks can draft orders offline; 1-click sync pushes them when online.
- [x] **Tamil Language Interface for Floor Staff:** Instant toggle between English and தமிழ் (e.g., "உற்பத்தி பதிவு", "மூலப்பொருள் இருப்பு") on the factory floor screen.
- [x] **Tally-Compatible XML Export:** Export sales vouchers in standard Tally XML format for direct import into TallyPrime / Tally.ERP 9.
- [x] **Credit Note Invalidation:** Posted invoices cannot be deleted; cancellation issues an audit-compliant Credit Note (`CN/2026-27/0001`).
- [x] **1-Click Benchmark Scenario Runner:** Dedicated in-app suite executing the 9 steps and validating all 11 checks in real time.

---

## 5. Section 5 Benchmark Scenario Results

Run the benchmark suite directly from the CLI:
```bash
npm run benchmark
```

### Verification Table (Expected vs. Actual)

| # | Benchmark Check | Expected Result (from PDF) | Actual System Result | Status |
|---|---|---|---|---|
| **1** | **Flour closing balance** | `120 kg (100 + 60 − 40)` | **120 kg** | ✅ **PASS** |
| **2** | **Oil closing balance** | `19.5 L (30 − 10.5)` | **19.5 L** | ✅ **PASS** |
| **3** | **Pouches closing balance** | `306 (500 − 188 used − 6 damaged)` | **306** | ✅ **PASS** |
| **4** | **Finished goods after run** | `238 packets (50 + 188)` | **238 packets** | ✅ **PASS** |
| **5** | **Finished goods after Retailer A dispatch** | `88 packets (238 − 150)` | **88 packets** | ✅ **PASS** |
| **6** | **Yield variance** | `188 vs 200 expected, −6%, flagged` | **-6.0%, FLAGGED** | ✅ **PASS** |
| **7** | **Oil consumption variance** | `+5%, flagged` | **+5.0%, FLAGGED** | ✅ **PASS** |
| **8** | **Retailer A invoice** | `₹7,500 taxable + ₹187.50 CGST + ₹187.50 SGST = ₹7,875` | **₹7,500 + ₹187.50 + ₹187.50 = ₹7,875.00** | ✅ **PASS** |
| **9** | **Retailer A outstanding** | `₹3,875 (₹7,875 − ₹4,000)` | **₹3,875.00** | ✅ **PASS** |
| **10** | **Distributor B order** | `Shortage of 32 packets flagged; IGST applies` | **Shortage: 32 pkts flagged; IGST 5% applied** | ✅ **PASS** |
| **11** | **Cost per packet** | `Stated with valuation method and overhead rule` | **₹30.90 per packet (FIFO)** | ✅ **PASS** |

### Mathematical Explanation of Cost Per Packet
- **Valuation Method:** First-In, First-Out (FIFO).
  - Flour: 40 kg consumed from opening lot @ ₹42/kg = ₹1,680.00
  - Cooking oil: 10.5 L consumed from opening lot @ ₹140/L = ₹1,470.00
  - Spice mix: 1.2 kg consumed from opening lot @ ₹200/kg = ₹240.00
  - Pouches: 188 good + 6 damaged = 194 pouches @ ₹2.50 = ₹485.00
  - Cartons: 9 cartons @ ₹15.00 = ₹135.00
  - **Direct Materials Total:** ₹4,010.00
- **Overheads Allocated:** Direct Labour (₹1,200) + Power/Gas (₹600) = ₹1,800.00.
- **Total Manufacturing Cost:** ₹4,010 + ₹1,800 = ₹5,810.00.
- **Cost per packet (for 188 actual packets produced):**
  $$\text{Cost Per Packet} = \frac{₹5,810}{188} = \mathbf{₹30.90}$$
- **Gross Profit Margin (@ ₹50 Selling Price):** ₹50.00 - ₹30.90 = **₹19.10 (38.2%)**.

*(Note: Under Weighted Average, flour rate is ₹43.125/kg, resulting in ₹31.14 per packet. Both strategies are supported and selectable in the UI).*

---

## 6. Documented Assumptions

1. **Financial Year Convention:** Indian financial year format `2026-27` is used for invoice numbering (`INV/2026-27/0001`).
2. **GST Place of Supply Rule:**
   - Factory is located in **Tamil Nadu (State Code: 33)**.
   - Retailer A in Tamil Nadu (33) $\rightarrow$ Intra-state: 2.5% CGST + 2.5% SGST.
   - Distributor B in Karnataka (29) $\rightarrow$ Inter-state: 5.0% IGST.
3. **Carton Capacity:** 1 carton holds 20 packets. For 188 packets, 9 full cartons were used (180 packets boxed, remainder in transit crate).
4. **Scrap Accounting:** Damaged packaging (6 pouches) is included in the direct manufacturing cost of the production run to ensure accurate absorption costing.

---

## 7. Running the Automated Test Suite

```bash
# Run unit & integration tests
npm test
```
Executes 11 tests across:
- `tests/unit/Money.test.ts`: Zero float drift, integer-paisa math.
- `tests/unit/Quantity.test.ts`: Accurate conversions (kg $\leftrightarrow$ g, L $\leftrightarrow$ ml, carton $\leftrightarrow$ packet).
- `tests/unit/TaxStrategy.test.ts`: Intra-state vs. Inter-state tax strategy rules.
- `tests/unit/CostValuation.test.ts`: FIFO vs. Weighted Average multi-lot consumption.
- `tests/integration/BenchmarkScenario.test.ts`: Full end-to-end 9-step scenario verification.

---

## 8. Git Commit History

The repository features a clean, progressive commit history illustrating systematic development:
1. `feat(core)`: Domain entities, value objects, SQLite schema, repositories and benchmark seeder.
2. `feat(application)`: Application services and automated benchmark verification suite with 100% check pass rate.
3. `test(core)`: Comprehensive unit and integration test suite covering money, quantity, taxes, valuation and benchmark scenario.
4. `feat(ui)`: Responsive React portals for Salesman, Admin, Production Floor (with Tamil UI), Auditor, and Owner.
5. `docs`: Design Note, demo script, and comprehensive documentation.
