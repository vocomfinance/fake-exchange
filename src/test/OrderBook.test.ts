import OrderBook, {Order, IOrderDetails, OrderType, OrderStatus} from "../OrderBook";

const uidRegexp = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

describe('with an order book for a fake share', () => {
  let orderBook: OrderBook;

  beforeEach(() => {
    orderBook = new OrderBook({
      name: 'Fake Company Inc',
      stock_symbol: 'FAKE',
      currency: 'USD',
    });
  });

  describe('when creating a buy order', () => {
    describe('and its first order of the book', () => {
      let order: Order;

      beforeEach(() => {
        order = orderBook.createOrder({
          type: OrderType.LimitBuy,
          shares: 10,
          price: 10.52,
        });
      });

      it('creates a posted limit buy order with a valid uid', () => {
        expect(order.id).toMatch(uidRegexp);
        expect(order.status).toEqual(OrderStatus.Posted);
        expect(order.details.type).toEqual(OrderType.LimitBuy);
        expect(order.isBuyOrder()).toBe(true);
      });

      it('matches bid order and first created order', () => {
        expect(order.id).toBe(orderBook.bidOrder().id);
      });
    })
  });

  describe('when creating a sell order', () => {
    describe('and its first order of the book', () => {
      let order: Order;

      beforeEach(() => {
        order = orderBook.createOrder({
          type: OrderType.LimitSell,
          shares: 10,
          price: 10.52,
        });
      });

      it('creates a posted limit buy order with a valid uid', () => {
        expect(order.id).toMatch(uidRegexp);
        expect(order.status).toEqual(OrderStatus.Posted);
        expect(order.details.type).toEqual(OrderType.LimitSell);
        expect(order.isSellOrder()).toBe(true);
      });

      it('matches bid order and first created order', () => {
        expect(order.id).toBe(orderBook.askOrder().id);
      });
    })
  });

  describe('with a few buy and sell orders in the book that can not be filled', () => {
    let oldestAndHighestBid: Order;
    let newerHighestBid: Order;
    let lowestBid: Order;

    let oldestAndLowestAsk: Order;
    let newerLowestAsk: Order;
    let highestAsk: Order;

    beforeEach(() => {
      oldestAndHighestBid = orderBook.createOrder({ type: OrderType.LimitBuy, shares: 100, price: 120 });
      newerHighestBid = orderBook.createOrder({ type: OrderType.LimitBuy, shares: 100, price: 120, });
      newerHighestBid.timestamp += 1;
      lowestBid = orderBook.createOrder({ type: OrderType.LimitBuy, shares: 100, price: 100, });

      oldestAndLowestAsk = orderBook.createOrder({ type: OrderType.LimitSell, shares: 100, price: 130 });
      newerLowestAsk = orderBook.createOrder({ type: OrderType.LimitSell, shares: 100, price: 130 });
      newerLowestAsk.timestamp += 1;
      highestAsk = orderBook.createOrder({ type: OrderType.LimitSell, shares: 100, price: 140 });
    });

    describe('when getting the bid order', () => {
      it('returns the ordered by priority asc buy orders', () => {
        expect(orderBook.buyOrders()).toStrictEqual([lowestBid, newerHighestBid, oldestAndHighestBid]);
      });

      it('matches bid order with oldest and highest bid', () => {
        expect(orderBook.bidOrder().id).toBe(oldestAndHighestBid.id);
      });
    });

    describe('when getting the bid order', () => {
      it('returns the ordered by priority asc buy orders', () => {
        expect(orderBook.sellOrders()).toStrictEqual([highestAsk, newerLowestAsk, oldestAndLowestAsk]);
      });

      it('matches bid order with oldest and highest bid', () => {
        expect(orderBook.askOrder().id).toBe(oldestAndLowestAsk.id);
      });
    });
  });
});
