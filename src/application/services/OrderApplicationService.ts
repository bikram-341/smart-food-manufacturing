import {
  IOrderRepository,
  IItemRepository,
  ICustomerRepository,
  IStockLedgerRepository,
  IAuditRepository,
} from '../interfaces/IRepositories.js';
import { SalesOrder, OrderItem } from '../../domain/entities/SalesOrder.js';
import { AuditLog } from '../../domain/entities/PurchaseOrder.js';
import { Money } from '../../domain/value-objects/Money.js';

export interface PlaceOrderCommand {
  customerId: string;
  salesmanId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPriceRupees?: number;
    notes?: string;
  }>;
  offlineId?: string;
}

export interface StockCheckResult {
  orderId?: string;
  isFullyCovered: boolean;
  totalShortagePackets: number;
  items: Array<{
    itemId: string;
    itemName: string;
    requestedQty: number;
    availableQty: number;
    shortageQty: number;
    isCovered: boolean;
  }>;
}

export class OrderApplicationService {
  constructor(
    private orderRepo: IOrderRepository,
    private itemRepo: IItemRepository,
    private customerRepo: ICustomerRepository,
    private stockLedgerRepo: IStockLedgerRepository,
    private auditRepo: IAuditRepository
  ) {}

  public async placeOrder(cmd: PlaceOrderCommand): Promise<SalesOrder> {
    const customer = await this.customerRepo.findById(cmd.customerId);
    if (!customer) {
      throw new Error(`Customer ${cmd.customerId} not found`);
    }

    if (!cmd.items || cmd.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const orderItems: OrderItem[] = [];
    for (const reqItem of cmd.items) {
      if (reqItem.quantity <= 0) {
        throw new Error(`Quantity for item ${reqItem.itemId} must be positive`);
      }
      const item = await this.itemRepo.findById(reqItem.itemId);
      if (!item) {
        throw new Error(`Item ${reqItem.itemId} not found`);
      }

      const unitPrice =
        reqItem.unitPriceRupees !== undefined
          ? Money.fromRupees(reqItem.unitPriceRupees)
          : item.standardRate;

      orderItems.push(
        new OrderItem({
          id: `oi_${Math.random().toString(36).substring(2, 9)}`,
          itemId: item.id,
          itemName: item.name,
          quantity: reqItem.quantity,
          unitPrice,
          taxRatePercent: item.taxRatePercent,
          notes: reqItem.notes,
        })
      );
    }

    const countAll = (await this.orderRepo.findAll()).length;
    const orderNumber = `SO-2026-${(countAll + 1).toString().padStart(4, '0')}`;

    const order = new SalesOrder({
      id: `ord_${Math.random().toString(36).substring(2, 9)}`,
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerStateCode: customer.stateCode,
      salesmanId: cmd.salesmanId,
      salesmanName: cmd.salesmanId.includes('salesman_b') ? 'Suresh (Salesman B - KA)' : 'Karthik (Salesman A - TN)',
      orderDate: new Date(),
      status: 'SUBMITTED',
      items: orderItems,
      offlineId: cmd.offlineId,
    });

    await this.orderRepo.save(order);

    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        userId: cmd.salesmanId,
        username: cmd.salesmanId,
        userRole: 'SALESMAN',
        action: 'ORDER_PLACED',
        entityName: 'SalesOrder',
        entityId: order.id,
        afterStateJson: JSON.stringify({
          orderNumber: order.orderNumber,
          customer: customer.name,
          totalTaxable: order.getTotalTaxableAmount().getRupees(),
          itemCount: order.items.length,
        }),
      })
    );

    return order;
  }

  /**
   * Verifies whether finished goods stock covers the order items.
   * Highlights shortage clearly for Admin verification.
   */
  public async checkStockAvailability(orderId: string): Promise<StockCheckResult> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const itemsResult: StockCheckResult['items'] = [];
    let isFullyCovered = true;
    let totalShortagePackets = 0;

    for (const item of order.items) {
      const balance = await this.stockLedgerRepo.getCurrentBalance(item.itemId);
      const isCovered = balance >= item.quantity;
      const shortage = isCovered ? 0 : Math.round((item.quantity - balance) * 100) / 100;

      if (!isCovered) {
        isFullyCovered = false;
        totalShortagePackets += shortage;
      }

      itemsResult.push({
        itemId: item.itemId,
        itemName: item.itemName,
        requestedQty: item.quantity,
        availableQty: balance,
        shortageQty: shortage,
        isCovered,
      });
    }

    return {
      orderId: order.id,
      isFullyCovered,
      totalShortagePackets,
      items: itemsResult,
    };
  }

  public async approveOrder(
    orderId: string,
    adminUserId: string,
    modifications?: Array<{ itemId: string; newQuantity: number; newUnitPriceRupees?: number }>
  ): Promise<SalesOrder> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (modifications && modifications.length > 0) {
      for (const mod of modifications) {
        order.updateItemQuantity(mod.itemId, mod.newQuantity);
      }
    }

    order.approve();
    await this.orderRepo.save(order);

    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        userId: adminUserId,
        username: 'admin',
        userRole: 'ADMIN',
        action: 'ORDER_APPROVED',
        entityName: 'SalesOrder',
        entityId: order.id,
        afterStateJson: JSON.stringify({ status: order.status }),
      })
    );

    return order;
  }

  public async rejectOrder(orderId: string, adminUserId: string, reason: string): Promise<SalesOrder> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    order.reject(reason);
    await this.orderRepo.save(order);

    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        userId: adminUserId,
        username: 'admin',
        userRole: 'ADMIN',
        action: 'ORDER_REJECTED',
        entityName: 'SalesOrder',
        entityId: order.id,
        afterStateJson: JSON.stringify({ status: order.status, reason }),
      })
    );

    return order;
  }

  public async getAllOrders(filters?: { customerId?: string; salesmanId?: string; status?: string }): Promise<SalesOrder[]> {
    return this.orderRepo.findAll(filters);
  }

  public async getOrderById(id: string): Promise<SalesOrder | null> {
    return this.orderRepo.findById(id);
  }
}
