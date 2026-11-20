import {
  IBillOfMaterialsRepository,
  IItemRepository,
  IProductionRunRepository,
  IStockLedgerRepository,
  IAuditRepository,
} from '../interfaces/IRepositories.js';
import {
  ProductionRun,
  ConsumedIngredient,
  DamagedMaterial,
} from '../../domain/entities/ProductionRun.js';
import { StockLedgerEntry } from '../../domain/entities/StockLedgerEntry.js';
import { AuditLog } from '../../domain/entities/PurchaseOrder.js';
import { Money } from '../../domain/value-objects/Money.js';
import { Unit } from '../../domain/value-objects/Unit.js';
import { ICostValuationStrategy } from '../../domain/strategies/ICostValuationStrategy.js';
import { FIFOValuationStrategy } from '../../domain/strategies/FIFOValuationStrategy.js';
import { WeightedAverageStrategy } from '../../domain/strategies/WeightedAverageStrategy.js';
import { LastPurchaseValuationStrategy } from '../../domain/strategies/LastPurchaseValuationStrategy.js';

export interface RecordProductionRunCommand {
  productId: string;
  supervisorUserId: string;
  actualGoodPackets: number;
  issuedIngredients: Array<{
    itemId: string;
    actualQuantity: number;
  }>;
  damagedPackaging?: Array<{
    itemId: string;
    quantity: number;
    reason: string;
  }>;
  cartonsUsed?: number;
  labourCostRupees?: number;
  overheadCostRupees?: number;
  notes?: string;
  valuationMethod?: 'FIFO' | 'WEIGHTED_AVERAGE' | 'LAST_PRICE';
  tolerancePercent?: number; // Default 3.0%
}

export class ProductionApplicationService {
  private fifoStrategy = new FIFOValuationStrategy();
  private weightedAvgStrategy = new WeightedAverageStrategy();
  private lastPriceStrategy = new LastPurchaseValuationStrategy();

  constructor(
    private bomRepo: IBillOfMaterialsRepository,
    private itemRepo: IItemRepository,
    private productionRepo: IProductionRunRepository,
    private stockLedgerRepo: IStockLedgerRepository,
    private auditRepo: IAuditRepository
  ) {}

  public async recordProductionRun(cmd: RecordProductionRunCommand): Promise<ProductionRun> {
    const tolerance = cmd.tolerancePercent ?? 3.0;
    const bom = await this.bomRepo.findByFinishedGoodId(cmd.productId);
    if (!bom) {
      throw new Error(`Bill of Materials not found for product ${cmd.productId}`);
    }

    const finishedGood = await this.itemRepo.findById(cmd.productId);
    if (!finishedGood) {
      throw new Error(`Product ${cmd.productId} not found`);
    }

    // Determine key raw material to calculate expected batch size (e.g. Flour 40kg)
    const keyBomItem = bom.items.find((item) => item.itemCategory === 'RAW_MATERIAL');
    if (!keyBomItem) {
      throw new Error('BOM has no raw material defined');
    }

    const keyIssued = cmd.issuedIngredients.find((i) => i.itemId === keyBomItem.itemId);
    const keyIssuedQty = keyIssued ? keyIssued.actualQuantity : keyBomItem.standardQuantity;

    // Expected yield based on key ingredient issued
    const plannedOutputPackets = bom.calculateExpectedYield(keyBomItem.itemId, keyIssuedQty);
    const actualOutputPackets = cmd.actualGoodPackets;

    // Yield variance: ((actual - planned) / planned) * 100
    const yieldVariancePercent =
      plannedOutputPackets > 0
        ? Math.round(((actualOutputPackets - plannedOutputPackets) / plannedOutputPackets) * 10000) / 100
        : 0;
    const isYieldAlert = Math.abs(yieldVariancePercent) > tolerance;

    // Select Valuation Strategy
    const valuationStrategy: ICostValuationStrategy =
      cmd.valuationMethod === 'WEIGHTED_AVERAGE'
        ? this.weightedAvgStrategy
        : cmd.valuationMethod === 'LAST_PRICE'
        ? this.lastPriceStrategy
        : this.fifoStrategy;

    const consumedIngredients: ConsumedIngredient[] = [];
    let totalMaterialsCost = Money.zero();

    // 1. Process Raw Materials Consumption & Variances
    for (const issued of cmd.issuedIngredients) {
      const item = await this.itemRepo.findById(issued.itemId);
      if (!item) {
        throw new Error(`Item ${issued.itemId} not found`);
      }

      const bomItem = bom.items.find((bi) => bi.itemId === issued.itemId);
      const plannedQuantity = bomItem
        ? Math.round((bomItem.standardQuantity * (plannedOutputPackets / bom.batchYieldPackets)) * 10000) / 10000
        : issued.actualQuantity;

      const varianceQuantity = Math.round((issued.actualQuantity - plannedQuantity) * 10000) / 10000;
      const variancePercent =
        plannedQuantity > 0
          ? Math.round((varianceQuantity / plannedQuantity) * 10000) / 100
          : 0;
      const isVarianceAlert = Math.abs(variancePercent) > tolerance;

      // Valuate using strategy
      const lots = await this.stockLedgerRepo.getAvailableLots(item.id);
      let costResult;
      try {
        costResult = valuationStrategy.calculateCost(issued.actualQuantity, lots);
      } catch (err: any) {
        // Fallback to standard item rate if lots exhausted
        const fallbackCost = item.standardRate.multiply(issued.actualQuantity);
        costResult = {
          totalCost: fallbackCost,
          effectiveUnitCost: item.standardRate,
          consumedLots: [],
          remainingLots: lots,
        };
      }

      totalMaterialsCost = totalMaterialsCost.add(costResult.totalCost);

      consumedIngredients.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        plannedQuantity,
        actualQuantity: issued.actualQuantity,
        varianceQuantity,
        variancePercent,
        isVarianceAlert,
        unitCost: costResult.effectiveUnitCost,
        totalCost: costResult.totalCost,
      });

      // Update remaining lots in database
      for (const rem of costResult.remainingLots) {
        await this.stockLedgerRepo.updateLotRemaining(rem.id, rem.quantityRemaining);
      }
    }

    // 2. Process Packaging Consumption (Good Pouches + Cartons)
    // Find pouch item from BOM
    const pouchBomItem = bom.items.find((bi) => bi.itemName.toLowerCase().includes('pouch'));
    if (pouchBomItem) {
      const pouchItem = await this.itemRepo.findById(pouchBomItem.itemId);
      if (pouchItem) {
        // Standard pouch count equals actual good packets produced
        const pouchLots = await this.stockLedgerRepo.getAvailableLots(pouchItem.id);
        const pouchCost = valuationStrategy.calculateCost(actualOutputPackets, pouchLots);
        totalMaterialsCost = totalMaterialsCost.add(pouchCost.totalCost);

        consumedIngredients.push({
          itemId: pouchItem.id,
          itemName: pouchItem.name,
          unit: pouchItem.unit,
          plannedQuantity: plannedOutputPackets,
          actualQuantity: actualOutputPackets,
          varianceQuantity: actualOutputPackets - plannedOutputPackets,
          variancePercent:
            plannedOutputPackets > 0
              ? Math.round(((actualOutputPackets - plannedOutputPackets) / plannedOutputPackets) * 10000) / 100
              : 0,
          isVarianceAlert: false,
          unitCost: pouchCost.effectiveUnitCost,
          totalCost: pouchCost.totalCost,
        });

        for (const rem of pouchCost.remainingLots) {
          await this.stockLedgerRepo.updateLotRemaining(rem.id, rem.quantityRemaining);
        }
      }
    }

    // Find carton item from BOM
    const cartonBomItem = bom.items.find((bi) => bi.itemName.toLowerCase().includes('carton'));
    const cartonsUsedCount = cmd.cartonsUsed ?? Math.ceil(actualOutputPackets / 20);
    if (cartonBomItem) {
      const cartonItem = await this.itemRepo.findById(cartonBomItem.itemId);
      if (cartonItem) {
        const cartonLots = await this.stockLedgerRepo.getAvailableLots(cartonItem.id);
        const cartonCost = valuationStrategy.calculateCost(cartonsUsedCount, cartonLots);
        totalMaterialsCost = totalMaterialsCost.add(cartonCost.totalCost);

        consumedIngredients.push({
          itemId: cartonItem.id,
          itemName: cartonItem.name,
          unit: cartonItem.unit,
          plannedQuantity: 10,
          actualQuantity: cartonsUsedCount,
          varianceQuantity: cartonsUsedCount - 10,
          variancePercent: Math.round(((cartonsUsedCount - 10) / 10) * 10000) / 100,
          isVarianceAlert: Math.abs(cartonsUsedCount - 10) > 0,
          unitCost: cartonCost.effectiveUnitCost,
          totalCost: cartonCost.totalCost,
        });

        for (const rem of cartonCost.remainingLots) {
          await this.stockLedgerRepo.updateLotRemaining(rem.id, rem.quantityRemaining);
        }
      }
    }

    // 3. Process Damaged Packaging / Scrap Materials
    const damagedList: DamagedMaterial[] = [];
    if (cmd.damagedPackaging && cmd.damagedPackaging.length > 0) {
      for (const dmg of cmd.damagedPackaging) {
        const item = await this.itemRepo.findById(dmg.itemId);
        if (!item) continue;

        const lots = await this.stockLedgerRepo.getAvailableLots(item.id);
        const dmgCost = valuationStrategy.calculateCost(dmg.quantity, lots);
        totalMaterialsCost = totalMaterialsCost.add(dmgCost.totalCost);

        damagedList.push({
          itemId: item.id,
          itemName: item.name,
          quantity: dmg.quantity,
          unit: item.unit,
          reason: dmg.reason,
          unitCost: dmgCost.effectiveUnitCost,
          totalCost: dmgCost.totalCost,
        });

        for (const rem of dmgCost.remainingLots) {
          await this.stockLedgerRepo.updateLotRemaining(rem.id, rem.quantityRemaining);
        }
      }
    }

    // 4. Overheads Allocation
    const labourCost = Money.fromRupees(cmd.labourCostRupees ?? 1200);
    const overheadCost = Money.fromRupees(cmd.overheadCostRupees ?? 600);
    const totalManufacturingCost = totalMaterialsCost.add(labourCost).add(overheadCost);

    // Approximate cost per packet = Total Cost / Actual Output Packets
    const costPerPacket =
      actualOutputPackets > 0
        ? totalManufacturingCost.divide(actualOutputPackets)
        : Money.zero();

    const runNumber = await this.productionRepo.getNextRunNumber();
    const productionRun = new ProductionRun({
      id: `pr_${Math.random().toString(36).substring(2, 9)}`,
      runNumber,
      productId: finishedGood.id,
      productName: finishedGood.name,
      runDate: new Date(),
      plannedOutputPackets,
      actualOutputPackets,
      yieldVariancePercent,
      isYieldAlert,
      labourCost,
      overheadCost,
      materialsCost: totalMaterialsCost,
      totalManufacturingCost,
      costPerPacket,
      ingredients: consumedIngredients,
      damagedMaterials: damagedList,
      status: 'COMPLETED',
      notes: cmd.notes,
    });

    await this.productionRepo.save(productionRun);

    // 5. CRITICAL: Automatically Update Double-Entry Stock Ledger
    const now = new Date();

    // A. Deduct consumed ingredients & packaging from stock ledger
    for (const ing of consumedIngredients) {
      const currentBalance = await this.stockLedgerRepo.getCurrentBalance(ing.itemId);
      const newBalance = Math.round((currentBalance - ing.actualQuantity) * 10000) / 10000;

      const ledgerEntry = new StockLedgerEntry({
        id: `sl_issue_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: now,
        itemId: ing.itemId,
        itemName: ing.itemName,
        itemCategory: (await this.itemRepo.findById(ing.itemId))?.category ?? 'RAW_MATERIAL',
        unit: ing.unit,
        movementType: 'PRODUCTION_ISSUE',
        referenceType: 'PRODUCTION_RUN',
        referenceId: productionRun.id,
        referenceNumber: productionRun.runNumber,
        quantityChange: -ing.actualQuantity,
        balanceAfter: newBalance,
        unitRate: ing.unitCost,
        totalValuation: ing.totalCost,
        notes: `Production run ${productionRun.runNumber} consumption`,
        createdBy: cmd.supervisorUserId,
      });

      await this.stockLedgerRepo.recordEntry(ledgerEntry);
    }

    // B. Deduct damaged packaging from stock ledger
    for (const dmg of damagedList) {
      const currentBalance = await this.stockLedgerRepo.getCurrentBalance(dmg.itemId);
      const newBalance = Math.round((currentBalance - dmg.quantity) * 10000) / 10000;

      const ledgerEntry = new StockLedgerEntry({
        id: `sl_dmg_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: now,
        itemId: dmg.itemId,
        itemName: dmg.itemName,
        itemCategory: 'PACKAGING',
        unit: dmg.unit,
        movementType: 'DAMAGE_SCRAP',
        referenceType: 'PRODUCTION_RUN',
        referenceId: productionRun.id,
        referenceNumber: productionRun.runNumber,
        quantityChange: -dmg.quantity,
        balanceAfter: newBalance,
        unitRate: dmg.unitCost,
        totalValuation: dmg.totalCost,
        notes: `Damaged packaging in production run ${productionRun.runNumber}: ${dmg.reason}`,
        createdBy: cmd.supervisorUserId,
      });

      await this.stockLedgerRepo.recordEntry(ledgerEntry);
    }

    // C. Add finished goods to stock ledger
    const currentFgBalance = await this.stockLedgerRepo.getCurrentBalance(finishedGood.id);
    const newFgBalance = currentFgBalance + actualOutputPackets;

    const fgLedgerEntry = new StockLedgerEntry({
      id: `sl_rcpt_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: now,
      itemId: finishedGood.id,
      itemName: finishedGood.name,
      itemCategory: 'FINISHED_GOOD',
      unit: finishedGood.unit,
      movementType: 'PRODUCTION_RECEIPT',
      referenceType: 'PRODUCTION_RUN',
      referenceId: productionRun.id,
      referenceNumber: productionRun.runNumber,
      quantityChange: actualOutputPackets,
      balanceAfter: newFgBalance,
      unitRate: costPerPacket,
      totalValuation: totalManufacturingCost,
      batchNumber: `BATCH-${productionRun.runNumber}`,
      notes: `Manufactured in run ${productionRun.runNumber}`,
      createdBy: cmd.supervisorUserId,
    });

    await this.stockLedgerRepo.recordEntry(fgLedgerEntry);

    // D. Create finished good stock lot for FIFO / FEFO tracking
    await this.stockLedgerRepo.createLot({
      id: `lot_fg_${productionRun.id}`,
      itemId: finishedGood.id,
      date: now,
      quantityRemaining: actualOutputPackets,
      unitRate: costPerPacket,
      batchNumber: `BATCH-${productionRun.runNumber}`,
    });

    // 6. Audit Logging
    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: now,
        userId: cmd.supervisorUserId,
        username: 'production',
        userRole: 'PRODUCTION',
        action: 'PRODUCTION_RUN_COMPLETED',
        entityName: 'ProductionRun',
        entityId: productionRun.id,
        afterStateJson: JSON.stringify({
          runNumber: productionRun.runNumber,
          plannedOutput: plannedOutputPackets,
          actualOutput: actualOutputPackets,
          yieldVariance: yieldVariancePercent,
          costPerPacket: costPerPacket.getRupees(),
        }),
      })
    );

    return productionRun;
  }

  public async getAllRuns(): Promise<ProductionRun[]> {
    return this.productionRepo.findAll();
  }

  public async getRunById(id: string): Promise<ProductionRun | null> {
    return this.productionRepo.findById(id);
  }
}
