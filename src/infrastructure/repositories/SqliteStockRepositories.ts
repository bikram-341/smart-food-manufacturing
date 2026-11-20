import { DatabaseConnection } from '../database/DatabaseConnection.js';
import { IBillOfMaterialsRepository, IStockLedgerRepository } from '../../application/interfaces/IRepositories.js';
import { BillOfMaterials, BOMItem } from '../../domain/entities/BillOfMaterials.js';
import { StockLedgerEntry, StockMovementType, ReferenceDocumentType } from '../../domain/entities/StockLedgerEntry.js';
import { Unit } from '../../domain/value-objects/Unit.js';
import { Money } from '../../domain/value-objects/Money.js';
import { StockLot } from '../../domain/strategies/ICostValuationStrategy.js';

export class SqliteBOMRepository implements IBillOfMaterialsRepository {
  public async findById(id: string): Promise<BillOfMaterials | null> {
    const db = DatabaseConnection.getInstance();
    const bomRow = db.prepare('SELECT * FROM boms WHERE id = ?').get(id) as any;
    if (!bomRow) return null;
    const itemRows = db.prepare('SELECT * FROM bom_items WHERE bom_id = ?').all(id) as any[];
    return this.mapToEntity(bomRow, itemRows);
  }

  public async findByFinishedGoodId(productId: string): Promise<BillOfMaterials | null> {
    const db = DatabaseConnection.getInstance();
    const bomRow = db.prepare('SELECT * FROM boms WHERE finished_good_id = ?').get(productId) as any;
    if (!bomRow) return null;
    const itemRows = db.prepare('SELECT * FROM bom_items WHERE bom_id = ?').all(bomRow.id) as any[];
    return this.mapToEntity(bomRow, itemRows);
  }

  public async findAll(): Promise<BillOfMaterials[]> {
    const db = DatabaseConnection.getInstance();
    const boms = db.prepare('SELECT * FROM boms').all() as any[];
    const result: BillOfMaterials[] = [];
    for (const b of boms) {
      const itemRows = db.prepare('SELECT * FROM bom_items WHERE bom_id = ?').all(b.id) as any[];
      result.push(this.mapToEntity(b, itemRows));
    }
    return result;
  }

  public async save(bom: BillOfMaterials): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const insertBom = db.prepare(`
      INSERT INTO boms (id, finished_good_id, product_name, batch_yield_packets)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        finished_good_id = excluded.finished_good_id,
        product_name = excluded.product_name,
        batch_yield_packets = excluded.batch_yield_packets
    `);

    const deleteItems = db.prepare('DELETE FROM bom_items WHERE bom_id = ?');
    const insertItem = db.prepare(`
      INSERT INTO bom_items (id, bom_id, item_id, item_name, standard_quantity, unit, item_category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertBom.run(bom.id, bom.finishedGoodId, bom.productName, bom.batchYieldPackets);
      deleteItems.run(bom.id);
      for (const item of bom.items) {
        insertItem.run(
          `bom_item_${Math.random().toString(36).substring(2, 9)}`,
          bom.id,
          item.itemId,
          item.itemName,
          item.standardQuantity,
          item.unit,
          item.itemCategory
        );
      }
    })();
  }

  private mapToEntity(bomRow: any, itemRows: any[]): BillOfMaterials {
    return new BillOfMaterials({
      id: bomRow.id,
      finishedGoodId: bomRow.finished_good_id,
      productName: bomRow.product_name,
      batchYieldPackets: bomRow.batch_yield_packets,
      items: itemRows.map((r) => ({
        itemId: r.item_id,
        itemName: r.item_name,
        standardQuantity: r.standard_quantity,
        unit: r.unit as Unit,
        itemCategory: r.item_category as 'RAW_MATERIAL' | 'PACKAGING',
      })),
    });
  }
}

export class SqliteStockLedgerRepository implements IStockLedgerRepository {
  public async recordEntry(entry: StockLedgerEntry): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      INSERT INTO stock_ledger (
        id, timestamp, item_id, item_name, item_category, unit, movement_type,
        reference_type, reference_id, reference_number, quantity_change,
        balance_after, unit_rate_paise, total_valuation_paise, batch_number,
        expiry_date, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.id,
      entry.timestamp.toISOString(),
      entry.itemId,
      entry.itemName,
      entry.itemCategory,
      entry.unit,
      entry.movementType,
      entry.referenceType,
      entry.referenceId,
      entry.referenceNumber,
      entry.quantityChange,
      entry.balanceAfter,
      entry.unitRate.getPaise(),
      entry.totalValuation.getPaise(),
      entry.batchNumber ?? null,
      entry.expiryDate ? entry.expiryDate.toISOString() : null,
      entry.notes ?? null,
      entry.createdBy
    );
  }

  /**
   * Derives current balance strictly from the immutable ledger of movements.
   * balance = SUM(quantity_change)
   */
  public async getCurrentBalance(itemId: string): Promise<number> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare(`
      SELECT COALESCE(SUM(quantity_change), 0) AS total_balance
      FROM stock_ledger
      WHERE item_id = ?
    `).get(itemId) as { total_balance: number };

    return Math.round(row.total_balance * 10000) / 10000;
  }

  public async getAllBalances(): Promise<Map<string, { currentBalance: number; unit: string; itemName: string; category: string }>> {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare(`
      SELECT 
        i.id,
        i.name AS item_name,
        i.category,
        i.unit,
        COALESCE(SUM(sl.quantity_change), 0) AS current_balance
      FROM items i
      LEFT JOIN stock_ledger sl ON i.id = sl.item_id
      GROUP BY i.id
    `).all() as any[];

    const map = new Map<string, { currentBalance: number; unit: string; itemName: string; category: string }>();
    for (const r of rows) {
      map.set(r.id, {
        currentBalance: Math.round(r.current_balance * 10000) / 10000,
        unit: r.unit,
        itemName: r.item_name,
        category: r.category,
      });
    }
    return map;
  }

  public async getLedgerForItem(itemId: string): Promise<StockLedgerEntry[]> {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare(`
      SELECT * FROM stock_ledger
      WHERE item_id = ?
      ORDER BY timestamp ASC, created_at ASC
    `).all(itemId) as any[];

    return rows.map((r) => this.mapRow(r));
  }

  public async getFullLedger(startDate?: Date, endDate?: Date): Promise<StockLedgerEntry[]> {
    const db = DatabaseConnection.getInstance();
    let query = 'SELECT * FROM stock_ledger';
    const params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(startDate.toISOString(), endDate.toISOString());
    } else if (startDate) {
      query += ' WHERE timestamp >= ?';
      params.push(startDate.toISOString());
    } else if (endDate) {
      query += ' WHERE timestamp <= ?';
      params.push(endDate.toISOString());
    }

    query += ' ORDER BY timestamp ASC, created_at ASC';
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public async getAvailableLots(itemId: string): Promise<StockLot[]> {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare(`
      SELECT * FROM stock_lots
      WHERE item_id = ? AND quantity_remaining > 0.0001
      ORDER BY date ASC
    `).all(itemId) as any[];

    return rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      date: new Date(r.date),
      quantityRemaining: r.quantity_remaining,
      unitRate: Money.fromPaise(r.unit_rate_paise),
      batchNumber: r.batch_number ?? undefined,
    }));
  }

  public async updateLotRemaining(lotId: string, newRemaining: number): Promise<void> {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      UPDATE stock_lots
      SET quantity_remaining = ?
      WHERE id = ?
    `).run(Math.round(newRemaining * 10000) / 10000, lotId);
  }

  public async createLot(lot: StockLot): Promise<void> {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO stock_lots (id, item_id, date, quantity_remaining, unit_rate_paise, batch_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      lot.id,
      lot.itemId,
      lot.date.toISOString(),
      lot.quantityRemaining,
      lot.unitRate.getPaise(),
      lot.batchNumber ?? null
    );
  }

  private mapRow(r: any): StockLedgerEntry {
    return new StockLedgerEntry({
      id: r.id,
      timestamp: new Date(r.timestamp),
      itemId: r.item_id,
      itemName: r.item_name,
      itemCategory: r.item_category,
      unit: r.unit as Unit,
      movementType: r.movement_type as StockMovementType,
      referenceType: r.reference_type as ReferenceDocumentType,
      referenceId: r.reference_id,
      referenceNumber: r.reference_number,
      quantityChange: r.quantity_change,
      balanceAfter: r.balance_after,
      unitRate: Money.fromPaise(r.unit_rate_paise),
      totalValuation: Money.fromPaise(r.total_valuation_paise),
      batchNumber: r.batch_number ?? undefined,
      expiryDate: r.expiry_date ? new Date(r.expiry_date) : undefined,
      notes: r.notes ?? undefined,
      createdBy: r.created_by,
    });
  }
}
