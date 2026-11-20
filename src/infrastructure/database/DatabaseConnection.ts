import Database, { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class DatabaseConnection {
  private static instance: DatabaseType | null = null;
  private static dbPath: string = path.resolve(process.cwd(), 'factory.db');

  public static setDbPath(newPath: string): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
    this.dbPath = newPath;
  }

  public static getInstance(): DatabaseType {
    if (!this.instance) {
      this.instance = new Database(this.dbPath);
      this.instance.pragma('journal_mode = WAL');
      this.instance.pragma('foreign_keys = ON');
      this.initializeSchema(this.instance);
    }
    return this.instance;
  }

  private static initializeSchema(db: DatabaseType): void {
    const candidates = [
      path.resolve(process.cwd(), 'src/infrastructure/database/schema.sql'),
      path.resolve(process.cwd(), 'dist/infrastructure/database/schema.sql'),
      path.resolve(process.cwd(), 'schema.sql'),
    ];
    for (const schemaFile of candidates) {
      if (fs.existsSync(schemaFile)) {
        const sql = fs.readFileSync(schemaFile, 'utf-8');
        db.exec(sql);
        break;
      }
    }
  }

  public static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }

  public static reset(): void {
    const db = this.getInstance();
    // Disable FK temporarily for clean truncate
    db.pragma('foreign_keys = OFF');
    const tables = [
      'audit_logs',
      'stock_ledger',
      'stock_lots',
      'production_run_damaged',
      'production_run_ingredients',
      'production_runs',
      'purchase_items',
      'purchases',
      'payments',
      'dispatch_items',
      'dispatches',
      'credit_notes',
      'invoice_items',
      'invoices',
      'order_items',
      'orders',
      'bom_items',
      'boms',
      'suppliers',
      'customers',
      'items',
      'users',
    ];
    for (const table of tables) {
      db.exec(`DELETE FROM ${table};`);
    }
    db.pragma('foreign_keys = ON');
  }
}
