import { DatabaseConnection } from '../database/DatabaseConnection.js';
import { IItemRepository, ICustomerRepository, ISupplierRepository } from '../../application/interfaces/IRepositories.js';
import { Item, ItemCategory } from '../../domain/entities/Item.js';
import { Customer, CustomerType, Supplier } from '../../domain/entities/Customer.js';
import { Unit } from '../../domain/value-objects/Unit.js';
import { Money } from '../../domain/value-objects/Money.js';

export class SqliteItemRepository implements IItemRepository {
  public async findById(id: string): Promise<Item | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  public async findBySku(sku: string): Promise<Item | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM items WHERE sku = ?').get(sku) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  public async findAll(): Promise<Item[]> {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare('SELECT * FROM items ORDER BY category, name').all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public async save(item: Item): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      INSERT INTO items (id, sku, name, category, unit, hsn_code, tax_rate_percent, standard_rate_paise, reorder_level, shelf_life_days, pack_size_gram)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        sku = excluded.sku,
        name = excluded.name,
        category = excluded.category,
        unit = excluded.unit,
        hsn_code = excluded.hsn_code,
        tax_rate_percent = excluded.tax_rate_percent,
        standard_rate_paise = excluded.standard_rate_paise,
        reorder_level = excluded.reorder_level,
        shelf_life_days = excluded.shelf_life_days,
        pack_size_gram = excluded.pack_size_gram
    `);
    stmt.run(
      item.id,
      item.sku,
      item.name,
      item.category,
      item.unit,
      item.hsnCode,
      item.taxRatePercent,
      item.standardRate.getPaise(),
      item.reorderLevel,
      item.shelfLifeDays ?? null,
      item.packSizeGram ?? null
    );
  }

  private mapRow(row: any): Item {
    return new Item({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category as ItemCategory,
      unit: row.unit as Unit,
      hsnCode: row.hsn_code,
      taxRatePercent: row.tax_rate_percent,
      standardRate: Money.fromPaise(row.standard_rate_paise),
      reorderLevel: row.reorder_level,
      shelfLifeDays: row.shelf_life_days ?? undefined,
      packSizeGram: row.pack_size_gram ?? undefined,
    });
  }
}

export class SqliteCustomerRepository implements ICustomerRepository {
  public async findById(id: string): Promise<Customer | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  public async findAll(): Promise<Customer[]> {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare('SELECT * FROM customers ORDER BY name').all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public async save(customer: Customer): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      INSERT INTO customers (id, name, type, gstin, state_code, state_name, phone, address, credit_limit_paise, assigned_salesman_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        gstin = excluded.gstin,
        state_code = excluded.state_code,
        state_name = excluded.state_name,
        phone = excluded.phone,
        address = excluded.address,
        credit_limit_paise = excluded.credit_limit_paise,
        assigned_salesman_id = excluded.assigned_salesman_id
    `);
    stmt.run(
      customer.id,
      customer.name,
      customer.type,
      customer.gstin,
      customer.stateCode,
      customer.stateName,
      customer.phone,
      customer.address,
      customer.creditLimit.getPaise(),
      customer.assignedSalesmanId ?? null
    );
  }

  private mapRow(row: any): Customer {
    return new Customer({
      id: row.id,
      name: row.name,
      type: row.type as CustomerType,
      gstin: row.gstin,
      stateCode: row.state_code,
      stateName: row.state_name,
      phone: row.phone,
      address: row.address,
      creditLimit: Money.fromPaise(row.credit_limit_paise),
      assignedSalesmanId: row.assigned_salesman_id ?? undefined,
    });
  }
}

export class SqliteSupplierRepository implements ISupplierRepository {
  public async findById(id: string): Promise<Supplier | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
    if (!row) return null;
    return new Supplier({
      id: row.id,
      name: row.name,
      gstin: row.gstin,
      stateCode: row.state_code,
      stateName: row.state_name,
      phone: row.phone,
      address: row.address,
    });
  }

  public async findAll(): Promise<Supplier[]> {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare('SELECT * FROM suppliers ORDER BY name').all() as any[];
    return rows.map(
      (row) =>
        new Supplier({
          id: row.id,
          name: row.name,
          gstin: row.gstin,
          stateCode: row.state_code,
          stateName: row.state_name,
          phone: row.phone,
          address: row.address,
        })
    );
  }

  public async save(supplier: Supplier): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      INSERT INTO suppliers (id, name, gstin, state_code, state_name, phone, address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        gstin = excluded.gstin,
        state_code = excluded.state_code,
        state_name = excluded.state_name,
        phone = excluded.phone,
        address = excluded.address
    `);
    stmt.run(
      supplier.id,
      supplier.name,
      supplier.gstin,
      supplier.stateCode,
      supplier.stateName,
      supplier.phone,
      supplier.address
    );
  }
}
