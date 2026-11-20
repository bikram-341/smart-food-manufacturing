import { DatabaseConnection } from './DatabaseConnection.js';
import { Item } from '../../domain/entities/Item.js';
import { Customer, Supplier } from '../../domain/entities/Customer.js';
import { BillOfMaterials } from '../../domain/entities/BillOfMaterials.js';
import { StockLedgerEntry } from '../../domain/entities/StockLedgerEntry.js';
import { Unit } from '../../domain/value-objects/Unit.js';
import { Money } from '../../domain/value-objects/Money.js';
import {
  SqliteItemRepository,
  SqliteCustomerRepository,
  SqliteSupplierRepository,
} from '../repositories/SqliteMasterRepositories.js';
import {
  SqliteBOMRepository,
  SqliteStockLedgerRepository,
} from '../repositories/SqliteStockRepositories.js';

export async function seedMasterData(): Promise<void> {
  const db = DatabaseConnection.getInstance();

  // Reset database for a clean, deterministic benchmark state
  DatabaseConnection.reset();

  // 1. Seed Users (RBAC)
  const users = [
    { id: 'usr_sales_a', username: 'salesman_a', name: 'Karthik (Salesman A - TN)', role: 'SALESMAN', phone: '9840112233' },
    { id: 'usr_sales_b', username: 'salesman_b', name: 'Suresh (Salesman B - KA)', role: 'SALESMAN', phone: '9840445566' },
    { id: 'usr_admin', username: 'admin', name: 'Meenakshi (Factory Admin)', role: 'ADMIN', phone: '9840778899' },
    { id: 'usr_prod', username: 'production', name: 'Murugan (Floor Supervisor)', role: 'PRODUCTION', phone: '9840123456' },
    { id: 'usr_auditor', username: 'auditor', name: 'Ramanathan (Auditor & CA)', role: 'AUDITOR', phone: '9840654321' },
    { id: 'usr_owner', username: 'owner', name: 'Sundaram (Factory Owner)', role: 'OWNER', phone: '9840999999' },
  ];

  const insertUser = db.prepare('INSERT INTO users (id, username, name, role, phone) VALUES (?, ?, ?, ?, ?)');
  for (const u of users) {
    insertUser.run(u.id, u.username, u.name, u.role, u.phone);
  }

  // 2. Seed Master Items
  const itemRepo = new SqliteItemRepository();
  const rawFlour = new Item({
    id: 'item_flour',
    sku: 'RM-FLOUR-01',
    name: 'Flour',
    category: 'RAW_MATERIAL',
    unit: Unit.KG,
    hsnCode: '11010000',
    taxRatePercent: 5.0,
    standardRate: Money.fromRupees(42),
    reorderLevel: 50,
  });

  const rawOil = new Item({
    id: 'item_oil',
    sku: 'RM-OIL-01',
    name: 'Cooking oil',
    category: 'RAW_MATERIAL',
    unit: Unit.LITRE,
    hsnCode: '15121910',
    taxRatePercent: 5.0,
    standardRate: Money.fromRupees(140),
    reorderLevel: 20,
  });

  const rawSpice = new Item({
    id: 'item_spice',
    sku: 'RM-SPICE-01',
    name: 'Salt and spice mix',
    category: 'RAW_MATERIAL',
    unit: Unit.KG,
    hsnCode: '21039040',
    taxRatePercent: 5.0,
    standardRate: Money.fromRupees(200),
    reorderLevel: 5,
  });

  const pkgPouch = new Item({
    id: 'item_pouch',
    sku: 'PM-POUCH-200G',
    name: '200 g pouch',
    category: 'PACKAGING',
    unit: Unit.PIECE,
    hsnCode: '39232100',
    taxRatePercent: 5.0,
    standardRate: Money.fromRupees(2.5),
    reorderLevel: 200,
  });

  const pkgCarton = new Item({
    id: 'item_carton',
    sku: 'PM-CARTON-20PKT',
    name: 'Carton (holds 20 packets)',
    category: 'PACKAGING',
    unit: Unit.PIECE,
    hsnCode: '48191010',
    taxRatePercent: 5.0,
    standardRate: Money.fromRupees(15),
    reorderLevel: 15,
  });

  const fgMurukku = new Item({
    id: 'item_murukku',
    sku: 'FG-MURUKKU-200G',
    name: 'Murukku 200 g',
    category: 'FINISHED_GOOD',
    unit: Unit.PACKET,
    hsnCode: '19059040',
    taxRatePercent: 5.0,
    standardRate: Money.fromRupees(50),
    packSizeGram: 200,
  });

  await itemRepo.save(rawFlour);
  await itemRepo.save(rawOil);
  await itemRepo.save(rawSpice);
  await itemRepo.save(pkgPouch);
  await itemRepo.save(pkgCarton);
  await itemRepo.save(fgMurukku);

  // 3. Seed Bill of Materials (BOM)
  const bomRepo = new SqliteBOMRepository();
  const murukkuBOM = new BillOfMaterials({
    id: 'bom_murukku_200g',
    finishedGoodId: fgMurukku.id,
    productName: fgMurukku.name,
    batchYieldPackets: 200,
    items: [
      { itemId: rawFlour.id, itemName: rawFlour.name, standardQuantity: 40, unit: Unit.KG, itemCategory: 'RAW_MATERIAL' },
      { itemId: rawOil.id, itemName: rawOil.name, standardQuantity: 10, unit: Unit.LITRE, itemCategory: 'RAW_MATERIAL' },
      { itemId: rawSpice.id, itemName: rawSpice.name, standardQuantity: 1.2, unit: Unit.KG, itemCategory: 'RAW_MATERIAL' },
      { itemId: pkgPouch.id, itemName: pkgPouch.name, standardQuantity: 200, unit: Unit.PIECE, itemCategory: 'PACKAGING' },
      { itemId: pkgCarton.id, itemName: pkgCarton.name, standardQuantity: 10, unit: Unit.PIECE, itemCategory: 'PACKAGING' },
    ],
  });
  await bomRepo.save(murukkuBOM);

  // 4. Seed Customers
  const customerRepo = new SqliteCustomerRepository();
  const retailerA = new Customer({
    id: 'cust_retailer_a',
    name: 'Retailer A (Tamil Nadu)',
    type: 'RETAILER',
    gstin: '33AABCR1234A1Z1',
    stateCode: '33',
    stateName: 'Tamil Nadu',
    phone: '9443312345',
    address: '12 Bazaar Street, Madurai, Tamil Nadu - 625001',
    creditLimit: Money.fromRupees(50000),
    assignedSalesmanId: 'usr_sales_a',
  });

  const distributorB = new Customer({
    id: 'cust_distributor_b',
    name: 'Distributor B (Karnataka)',
    type: 'DISTRIBUTOR',
    gstin: '29AABCD5678B1Z2',
    stateCode: '29',
    stateName: 'Karnataka',
    phone: '9880098765',
    address: '45 Commercial Street, Bangalore, Karnataka - 560001',
    creditLimit: Money.fromRupees(100000),
    assignedSalesmanId: 'usr_sales_b',
  });

  await customerRepo.save(retailerA);
  await customerRepo.save(distributorB);

  // 5. Seed Supplier
  const supplierRepo = new SqliteSupplierRepository();
  const supplierA = new Supplier({
    id: 'supp_tamil_agro',
    name: 'Tamil Agro Traders',
    gstin: '33AABCS9999C1Z0',
    stateCode: '33',
    stateName: 'Tamil Nadu',
    phone: '9442288888',
    address: '88 Grain Market Road, Tiruchirappalli, Tamil Nadu - 620002',
  });
  await supplierRepo.save(supplierA);

  // 6. Seed Opening Stock in Immutable Stock Ledger and Stock Lots
  const stockLedgerRepo = new SqliteStockLedgerRepository();
  const openingStockEntries = [
    {
      item: rawFlour,
      qty: 100,
      rateRupees: 42,
      lotId: 'lot_open_flour',
    },
    {
      item: rawOil,
      qty: 30,
      rateRupees: 140,
      lotId: 'lot_open_oil',
    },
    {
      item: rawSpice,
      qty: 5,
      rateRupees: 200,
      lotId: 'lot_open_spice',
    },
    {
      item: pkgPouch,
      qty: 500,
      rateRupees: 2.5,
      lotId: 'lot_open_pouch',
    },
    {
      item: pkgCarton,
      qty: 30,
      rateRupees: 15,
      lotId: 'lot_open_carton',
    },
    {
      item: fgMurukku,
      qty: 50,
      rateRupees: 50,
      lotId: 'lot_open_murukku',
    },
  ];

  const openingDate = new Date('2026-11-01T08:00:00Z');

  for (const entry of openingStockEntries) {
    const unitRate = Money.fromRupees(entry.rateRupees);
    const totalVal = unitRate.multiply(entry.qty);

    const ledgerEntry = new StockLedgerEntry({
      id: `sl_open_${entry.item.id}`,
      timestamp: openingDate,
      itemId: entry.item.id,
      itemName: entry.item.name,
      itemCategory: entry.item.category,
      unit: entry.item.unit,
      movementType: 'OPENING_STOCK',
      referenceType: 'OPENING_BALANCE',
      referenceId: 'OPEN-2026-001',
      referenceNumber: 'OPEN-2026-001',
      quantityChange: entry.qty,
      balanceAfter: entry.qty,
      unitRate,
      totalValuation: totalVal,
      batchNumber: 'OPN-BATCH-01',
      notes: 'Initial master opening stock for benchmark scenario',
      createdBy: 'System Seeder',
    });

    await stockLedgerRepo.recordEntry(ledgerEntry);

    await stockLedgerRepo.createLot({
      id: entry.lotId,
      itemId: entry.item.id,
      date: openingDate,
      quantityRemaining: entry.qty,
      unitRate,
      batchNumber: 'OPN-BATCH-01',
    });
  }

  console.log('Master data and opening stock successfully seeded!');
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('seeder.ts') || process.argv[1]?.endsWith('seeder.js')) {
  seedMasterData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
