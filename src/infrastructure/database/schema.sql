-- Order-to-Audit Relational Schema (SQLite with WAL & Strict Foreign Keys)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SALESMAN', 'ADMIN', 'PRODUCTION', 'AUDITOR', 'OWNER')),
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('RAW_MATERIAL', 'PACKAGING', 'FINISHED_GOOD', 'WORK_IN_PROGRESS')),
    unit TEXT NOT NULL,
    hsn_code TEXT NOT NULL,
    tax_rate_percent REAL NOT NULL DEFAULT 5.0,
    standard_rate_paise INTEGER NOT NULL,
    reorder_level REAL DEFAULT 0,
    shelf_life_days INTEGER,
    pack_size_gram REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('RETAILER', 'DISTRIBUTOR')),
    gstin TEXT NOT NULL,
    state_code TEXT NOT NULL,
    state_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    credit_limit_paise INTEGER NOT NULL DEFAULT 0,
    assigned_salesman_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assigned_salesman_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gstin TEXT NOT NULL,
    state_code TEXT NOT NULL,
    state_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boms (
    id TEXT PRIMARY KEY,
    finished_good_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    batch_yield_packets INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(finished_good_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS bom_items (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    standard_quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    item_category TEXT NOT NULL,
    FOREIGN KEY(bom_id) REFERENCES boms(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_state_code TEXT NOT NULL,
    salesman_id TEXT NOT NULL,
    salesman_name TEXT NOT NULL,
    order_date DATETIME NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICED', 'DISPATCHED', 'CANCELLED')),
    offline_id TEXT,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(salesman_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price_paise INTEGER NOT NULL,
    tax_rate_percent REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    financial_year TEXT NOT NULL,
    order_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_gstin TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_state_code TEXT NOT NULL,
    customer_state_name TEXT NOT NULL,
    supplier_gstin TEXT NOT NULL,
    supplier_state_code TEXT NOT NULL,
    supplier_state_name TEXT NOT NULL,
    invoice_date DATETIME NOT NULL,
    is_inter_state INTEGER NOT NULL,
    total_taxable_paise INTEGER NOT NULL,
    total_cgst_paise INTEGER NOT NULL,
    total_sgst_paise INTEGER NOT NULL,
    total_igst_paise INTEGER NOT NULL,
    grand_total_paise INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('ISSUED', 'CANCELLED')),
    credit_note_id TEXT,
    cancellation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    hsn_code TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price_paise INTEGER NOT NULL,
    taxable_amount_paise INTEGER NOT NULL,
    tax_rate_percent REAL NOT NULL,
    cgst_amount_paise INTEGER NOT NULL,
    sgst_amount_paise INTEGER NOT NULL,
    igst_amount_paise INTEGER NOT NULL,
    total_amount_paise INTEGER NOT NULL,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id TEXT PRIMARY KEY,
    credit_note_number TEXT UNIQUE NOT NULL,
    invoice_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    reason TEXT NOT NULL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id),
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS dispatches (
    id TEXT PRIMARY KEY,
    dispatch_number TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    dispatch_date DATETIME NOT NULL,
    transport_mode TEXT,
    vehicle_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(invoice_id) REFERENCES invoices(id),
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS dispatch_items (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    batch_number TEXT,
    FOREIGN KEY(dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    payment_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    invoice_id TEXT,
    amount_paise INTEGER NOT NULL,
    payment_date DATETIME NOT NULL,
    payment_mode TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'NEFT', 'CHEQUE')),
    reference_number TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(invoice_id) REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    purchase_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    supplier_gstin TEXT NOT NULL,
    supplier_invoice_number TEXT NOT NULL,
    purchase_date DATETIME NOT NULL,
    total_taxable_paise INTEGER NOT NULL,
    total_cgst_paise INTEGER NOT NULL,
    total_sgst_paise INTEGER NOT NULL,
    total_igst_paise INTEGER NOT NULL,
    grand_total_paise INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity REAL NOT NULL,
    rate_paise INTEGER NOT NULL,
    tax_rate_percent REAL NOT NULL,
    taxable_amount_paise INTEGER NOT NULL,
    cgst_amount_paise INTEGER NOT NULL,
    sgst_amount_paise INTEGER NOT NULL,
    igst_amount_paise INTEGER NOT NULL,
    total_amount_paise INTEGER NOT NULL,
    batch_number TEXT,
    expiry_date DATETIME,
    FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS production_runs (
    id TEXT PRIMARY KEY,
    run_number TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    run_date DATETIME NOT NULL,
    planned_output_packets INTEGER NOT NULL,
    actual_output_packets INTEGER NOT NULL,
    yield_variance_percent REAL NOT NULL,
    is_yield_alert INTEGER NOT NULL DEFAULT 0,
    labour_cost_paise INTEGER NOT NULL DEFAULT 0,
    overhead_cost_paise INTEGER NOT NULL DEFAULT 0,
    materials_cost_paise INTEGER NOT NULL DEFAULT 0,
    total_manufacturing_cost_paise INTEGER NOT NULL DEFAULT 0,
    cost_per_packet_paise INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS production_run_ingredients (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    planned_quantity REAL NOT NULL,
    actual_quantity REAL NOT NULL,
    variance_quantity REAL NOT NULL,
    variance_percent REAL NOT NULL,
    is_variance_alert INTEGER NOT NULL DEFAULT 0,
    unit_cost_paise INTEGER NOT NULL,
    total_cost_paise INTEGER NOT NULL,
    FOREIGN KEY(run_id) REFERENCES production_runs(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS production_run_damaged (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    reason TEXT NOT NULL,
    unit_cost_paise INTEGER NOT NULL,
    total_cost_paise INTEGER NOT NULL,
    FOREIGN KEY(run_id) REFERENCES production_runs(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS stock_lots (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    date DATETIME NOT NULL,
    quantity_remaining REAL NOT NULL,
    unit_rate_paise INTEGER NOT NULL,
    batch_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id TEXT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_category TEXT NOT NULL,
    unit TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    quantity_change REAL NOT NULL,
    balance_after REAL NOT NULL,
    unit_rate_paise INTEGER NOT NULL,
    total_valuation_paise INTEGER NOT NULL,
    batch_number TEXT,
    expiry_date DATETIME,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_state_json TEXT,
    after_state_json TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying and reporting
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_stock_lots_item ON stock_lots(item_id, quantity_remaining);
