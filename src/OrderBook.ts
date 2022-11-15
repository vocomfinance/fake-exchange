import { v4 as uuidv4 } from 'uuid';

import {TradingPair} from './Exchange';

type UID = string;
const createUID = (): UID => uuidv4();

interface ITransaction {
  id: UID,
  buyer: IOrder,
  seller: IOrder,
}

interface IOrder {
  id: UID,
  details: IOrderDetails,
  status: OrderStatus,
  timestamp: Timestamp,
  transactions: ITransaction[],
}

type Timestamp = number;

class Order implements IOrder {
  id: UID;
  details: IOrderDetails;
  status: OrderStatus;
  timestamp: Timestamp;
  transactions: ITransaction[];

  constructor(id: UID, details: IOrderDetails, status: OrderStatus, timestamp: Timestamp, transactions: ITransaction[]) {
    this.id = id;
    this.details = details;
    this.status = status;
    this.timestamp = timestamp;
    this.transactions = transactions;
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
type TransactionsMap = { [key: UID]: ITransaction };

class OrderBook {
  tradingPair: TradingPair;
  orders: OrdersMap;
  transactions: TransactionsMap;

  constructor(tradingPair: TradingPair) {
    this.tradingPair = tradingPair;
    this.orders = {} as OrdersMap;
    this.transactions = {} as TransactionsMap;
  }

  pendingOrders() {
    const orders = Object.values(this.orders);
    return orders.filter((order: Order) => order.canBeFilled());
  }

  sellOrders() {
    console.log(this.pendingOrders());
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

  createOrder(orderDetails: IOrderDetails) : Order {
    const id = createUID();

    const order = new Order(id, orderDetails, OrderStatus.Posted, Date.now(), []);
    this.orders[id] = order;
    return order;
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
