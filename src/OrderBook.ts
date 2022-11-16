import { v4 as uuidv4 } from 'uuid';

import {TradingPair} from './Exchange';

type UID = string;
const createUID = (): UID => uuidv4();

interface ITrade {
  id: UID,
  bidOrderId: UID,
  askOrderId: UID,
  timestamp: Timestamp
}

class Trade implements ITrade {
  id: UID;
  timestamp: Timestamp;
  bidOrderId: UID;
  askOrderId: UID;
  shares: number;
  price: number;

  constructor(bidOrderId: UID, askOrderId: UID, shares: number, price: number) {
    this.id = uuidv4();
    this.timestamp = Date.now();

    this.bidOrderId = bidOrderId;
    this.askOrderId = askOrderId;
    this.shares = shares;
    this.price = price;
  }
}

interface IOrder {
  id: UID,
  details: IOrderDetails,
  status: OrderStatus,
  timestamp: Timestamp,
  tradeIds: UID[],
}

type Timestamp = number;

class Order implements IOrder {
  id: UID;
  details: IOrderDetails;
  status: OrderStatus;
  timestamp: Timestamp;
  tradeIds: UID[];

  constructor(details: IOrderDetails, status: OrderStatus) {
    this.id = createUID();
    this.timestamp = Date.now();

    this.details = details;
    this.status = status;
    this.tradeIds = [];
  }

  isSellOrder() {
    return this.details.type === OrderType.LimitSell;
  }

  isBuyOrder() {
    return this.details.type === OrderType.LimitBuy;
  }

  canBeFilled() {
    return [OrderStatus.Posted, OrderStatus.PartiallyFilled].includes(this.status);
  }

  isNewerThan(order: Order) : boolean {
    return this.timestamp > order.timestamp;
  }

  addTrade(trade: Trade) {
    this.tradeIds.push(trade.id);
  }

  priorityAgainst(order: Order) : number {
    if (this.details.price === order.details.price) return order.timestamp - this.timestamp;
    if (this.isBuyOrder()) return this.details.price > order.details.price ? 1 : -1;
    return this.details.price < order.details.price ? 1 : -1;
  }
}

interface IOrderDetails {
  type: OrderType,
  price: number,
  shares: number,
}

enum OrderType {
  LimitBuy,
  LimitSell,
}

enum OrderStatus {
  Posted,
  Cancelled,
  PartiallyFilled,
  Filled
}

type OrdersMap = { [key: UID]: Order };
type TradesMap = { [key: UID]: Trade };

class OrderBook {
  tradingPair: TradingPair;
  orders: OrdersMap;
  trades: TradesMap;

  constructor(tradingPair: TradingPair) {
    this.tradingPair = tradingPair;
    this.orders = {} as OrdersMap;
    this.trades = {} as TradesMap;
  }

  pendingOrders() {
    const orders = Object.values(this.orders);
    return orders.filter((order: Order) => order.canBeFilled());
  }

  sellOrders() {
    return this.pendingOrders()
      .filter((order: Order) => order.isSellOrder())
      .sort((l, r) => l.priorityAgainst(r));
  }

  buyOrders() {
    return this.pendingOrders()
      .filter((order: Order) => order.isBuyOrder())
      .sort((l, r) => l.priorityAgainst(r));
  }

  bidOrder() {
    const orders = this.buyOrders();
    return orders[orders.length - 1];
  }

  askOrder() {
    const orders = this.sellOrders();
    return orders[orders.length - 1];
  }

  createOrder(orderDetails: IOrderDetails) : Order | never {
    if (!this.areOrderDetailsValid(orderDetails)) throw new Error('Can not create order with this details')

    const order = new Order(orderDetails, OrderStatus.Posted);
    this.fillOrderIfPossible(order);
    this.saveOrder(order);

    console.log(order);

    return order;
  }

  private areOrderDetailsValid(orderDetails: IOrderDetails) : boolean {
    return orderDetails.shares > 0 && orderDetails.price > 0;
  }

  cancelOrderById(orderId: UID) : Order | never {
    const order = this.orders[orderId];
    if(!order.canBeFilled()) throw new Error('Cannot cancel an order already cancelled or filled.');
    order.status = OrderStatus.Cancelled;
    this.saveOrder(order);
    return order;
  }

  saveOrder(order: Order) {
    this.orders[order.id] = order;
  }

  saveTrade(trade: Trade) {
    this.trades[trade.id] = trade;
  }

  getTradesByIds(tradeIds: UID[]) : Trade[] {
    return tradeIds.map((tradeId) => this.trades[tradeId]);
  }

  canBeMatchedWithOrder(order: Order): boolean {
    if (!order.canBeFilled()) return false;
    else if (order.isBuyOrder()) return order.details.price >= this.askOrder()?.details?.price;
    else return order.details.price <= this.bidOrder()?.details?.price;
  }

  private fillOrderIfPossible(order: Order) {
    if(!this.canBeMatchedWithOrder(order)) return;
    this.fillOrder(order);
    this.fillOrderIfPossible(order);
  }

  private fillOrder(order: Order) {
    if(order.isBuyOrder()) this.createTradeBetween(order, this.askOrder());
    else { this.createTradeBetween(this.bidOrder(), order) }
  }

  private createTradeBetween(bidOrder: Order, askOrder: Order) : Trade {
    const sharesToBeTraded = Math.min(bidOrder.details.shares, askOrder.details.shares);
    const prices = [askOrder.details.price, bidOrder.details.price]
    const tradePrice = bidOrder.isNewerThan(askOrder) ? Math.min(...prices) : Math.max(...prices);

    const trade = new Trade(bidOrder.id, askOrder.id, sharesToBeTraded, tradePrice);

    [bidOrder, askOrder].map((o) => {
      o.details.shares -= sharesToBeTraded;
      o.status = o.details.shares == 0 ? OrderStatus.Filled : OrderStatus.PartiallyFilled;
      o.addTrade(trade);
      this.saveOrder(o);
      return o;
    });

    this.saveTrade(trade);

    return trade;
  }
};

export default OrderBook;
export {
  IOrder,
  Order,
  IOrderDetails,
  OrderType,
  OrderStatus
}
