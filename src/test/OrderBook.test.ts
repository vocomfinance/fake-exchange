import OrderBook, {Order, IOrderDetails, OrderType, OrderStatus, OrderBookEventCallback} from "../OrderBook";
import { EventEmitter } from "stream";

const uidRegexp = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

describe('with an order book for a fake share', () => {
  let orderBook: OrderBook;
  const eventCallbackMock = jest.fn((eventName: string, payload: any) => {});

  beforeEach(() => {
    eventCallbackMock.mockClear();

    orderBook = new OrderBook({
      id: 'FAKE',
      name: 'Fake Company Inc',
      stock_symbol: 'FAKE',
      currency: 'USD',
    }, eventCallbackMock);
  });

  describe('when creating a buy order', () => {
    let order: Order;

    describe('when order details are not valid', () => {
      it('can not be created', () => {
        expect(() => orderBook.createOrder({
          type: OrderType.LimitBuy,
          price: 0,
          shares: 0,
        })).toThrow();
      });
    });

    describe('and its first order of the book', () => {
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

      describe('when the order is in fillable status', () => {
        describe('when canceling the order', () => {
          let canceledOrder: Order;

          beforeEach(() => {
            canceledOrder = orderBook.cancelOrderById(order.id);
          });

          it('can be canceled', () => {
            expect(canceledOrder.status).toBe(OrderStatus.Cancelled);
          });

          it('can not be matched with an ask order', () => {
            const askOrder = new Order({
              type: OrderType.LimitSell,
              price: canceledOrder.details.price,
              shares: canceledOrder.details.shares,
            }, OrderStatus.Posted);

            expect(orderBook.canBeMatchedWithOrder(askOrder)).toBe(false);
          });
        });

        it('matches bid order and first created order', () => {
          expect(order.id).toBe(orderBook.bidOrder().id);
        });
      });

      describe('when checking against a sell order', () => {
        it('can be filled by a lower price ask', () => {
          const askOrder = new Order({
            type: OrderType.LimitSell,
            price: order.details.price - 1.0,
            shares: order.details.shares,
          }, OrderStatus.Posted);

          expect(orderBook.canBeMatchedWithOrder(askOrder)).toBe(true);
        });

        it('can be filled by a same price ask', () => {
          const askOrder = new Order({
            type: OrderType.LimitSell,
            price: order.details.price,
            shares: order.details.shares,
          }, OrderStatus.Posted);

          expect(orderBook.canBeMatchedWithOrder(askOrder)).toBe(true);
        });

        it('cannot be filled by a higher price ask', () => {
          const askOrder = new Order({
            type: OrderType.LimitSell,
            price: order.details.price + 1,
            shares: order.details.shares,
          }, OrderStatus.Posted);

          expect(orderBook.canBeMatchedWithOrder(askOrder)).toBe(false);
        });
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

      describe('when checking against a buy order', () => {
        it('can be filled by a higher price bid', () => {
          const bidOrder = new Order({
            type: OrderType.LimitBuy,
            price: order.details.price + 1.0,
            shares: order.details.shares,
          }, OrderStatus.Posted);

          expect(orderBook.canBeMatchedWithOrder(bidOrder)).toBe(true);
        });

        it('can be filled by a same price ask', () => {
          const bidOrder = new Order({
            type: OrderType.LimitBuy,
            price: order.details.price,
            shares: order.details.shares,
          }, OrderStatus.Posted);

          expect(orderBook.canBeMatchedWithOrder(bidOrder)).toBe(true);
        });

        it('cannot be filled by a lower price ask', () => {
          const bidOrder = new Order({
            type: OrderType.LimitBuy,
            price: order.details.price - 1,
            shares: order.details.shares,
          }, OrderStatus.Posted);

          expect(orderBook.canBeMatchedWithOrder(bidOrder)).toBe(false);
        });
      });
    })
  });

  describe('with whatever type of order', () => {
    describe('when the order can be filled', () => {
      it.todo('can be canceled');
    });

    describe('when the order is canceled or filled', () => {
      it.todo('cannot be canceled');
    });
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
      highestAsk = orderBook.createOrder({ type: OrderType.LimitSell, shares: 100, price: 140 });
      newerLowestAsk = orderBook.createOrder({ type: OrderType.LimitSell, shares: 100, price: 130 });
      newerLowestAsk.timestamp += 1;
    });

    describe('when acessing the bid orders', () => {
      it('returns the ordered by priority asc buy orders', () => {
        expect(orderBook.buyOrders()).toStrictEqual([lowestBid, newerHighestBid, oldestAndHighestBid]);
      });

      it('matches bid order with oldest and highest bid', () => {
        expect(orderBook.bidOrder().id).toBe(oldestAndHighestBid.id);
      });
    });

    describe('when accessing ask orders', () => {
      it('returns the ordered by priority asc buy orders', () => {
        expect(orderBook.sellOrders()).toStrictEqual([highestAsk, newerLowestAsk, oldestAndLowestAsk]);
      });

      it('matches ask order with oldest and highest ask', () => {
        expect(orderBook.askOrder().id).toBe(oldestAndLowestAsk.id);
      });
    });
  });

  describe('when posting a new bid order that can be filled', () => {
    let bidOrder: Order;
    let bidPrice = 10.2;
    let bidShares = 10;

    const postBidOrder = () => {
      bidOrder = orderBook.createOrder({
        type: OrderType.LimitBuy,
        shares: bidShares,
        price: bidPrice
      });
    }

    describe('by matching one previous ask order', () => {
      describe('when the price and shares are the same', () => {
        beforeEach(() => {
          const askOrder = orderBook.createOrder({
            type: OrderType.LimitSell,
            shares: bidShares,
            price: bidPrice,
          });
          orderBook.orders[askOrder.id].timestamp -= 1;

          postBidOrder();
        });

        describe('when order has been created', () => {
          it('is totally filled in one transaction at same price', () => {
            expect(bidOrder.status).toBe(OrderStatus.Filled);
            expect(bidOrder.details.shares).toBe(0);
            expect(bidOrder.tradeIds.length).toBe(1);
          });

          it('created a trade and updates the matched ask order', () => {
            const trade = orderBook.trades[bidOrder.tradeIds[0]];
            expect(trade.shares).toBe(bidShares);
            expect(trade.price).toBe(bidPrice);

            const askOrder = orderBook.orders[trade.askOrderId];
            expect(askOrder.status).toBe(OrderStatus.Filled);
            expect(askOrder.details.shares).toBe(0);
            expect(askOrder.tradeIds.length).toBe(1);
          });

          it('can not be canceled', () => {
            expect(() => orderBook.cancelOrderById(bidOrder.id)).toThrow();
          });
        });
      });

      describe('when ask price is lower but shares are the same', () => {
        beforeEach(() => {
          const askOrder = orderBook.createOrder({
            type: OrderType.LimitSell,
            shares: bidShares,
            price: bidPrice - 0.1,
          });
          orderBook.orders[askOrder.id].timestamp -= 1;

          postBidOrder();
        });

        it('is totally filled in one transaction at lowest price', () => {
          expect(bidOrder.status).toBe(OrderStatus.Filled);
          expect(bidOrder.details.shares).toBe(0);
          expect(bidOrder.tradeIds.length).toBe(1);

          const trade = orderBook.trades[bidOrder.tradeIds[0]];
          expect(trade.shares).toBe(bidShares);
          expect(trade.price).toBe(bidPrice - 0.1);

          const askOrder = orderBook.orders[trade.askOrderId];
          expect(askOrder.status).toBe(OrderStatus.Filled);
          expect(askOrder.details.shares).toBe(0);
          expect(askOrder.tradeIds.length).toBe(1);
        });
      });
    });

    describe('by matching several ask orders', () => {
      describe('when totally matching ask orders with same details than bid', () => {
        let oldestAsk: Order;
        let latestAsk: Order;

        const oldestShares = 2;
        const latestShares = bidShares - oldestShares;

        beforeEach(() => {
          oldestAsk = orderBook.createOrder({
            type: OrderType.LimitSell,
            shares: oldestShares,
            price: bidPrice,
          });
          orderBook.orders[oldestAsk.id].timestamp -= 2;

          latestAsk = orderBook.createOrder({
            type: OrderType.LimitSell,
            shares: latestShares,
            price: bidPrice,
          });
          orderBook.orders[oldestAsk.id].timestamp -= 1;

          postBidOrder();
        });

        it('is totally filled', () => {
          expect(bidOrder.status).toBe(OrderStatus.Filled);
          expect(bidOrder.details.shares).toBe(0);
          expect(bidOrder.tradeIds.length).toBe(2);

          expect(orderBook.getTradesByIds(bidOrder.tradeIds)).toEqual(expect.arrayContaining([
            expect.objectContaining({
              bidOrderId: bidOrder.id,
              askOrderId: latestAsk.id,
              shares: latestShares,
              price: bidPrice,
            }),
            expect.objectContaining({
              bidOrderId: bidOrder.id,
              askOrderId: oldestAsk.id,
              shares: oldestShares,
              price: bidPrice,
            }),
          ]));
        });
      });
    });

    describe('when it can be partially filled by matching an ask order', () => {
      it.todo('is totally filled in one transaction');
      it.todo('updates the filled and partially filled ask orders');
    });

    describe('when it can be partially filled by matching several ask orders', () => {
      it.todo('is totally filled in one transaction');
      it.todo('updates the filled and partially filled ask orders');
    });
  });

  describe('when posting a new ask order that can be filled', () => {
    let askOrder: Order;
    let askPrice = 10.2;
    let askShares = 10;

    const postAskOrder = () => {
      askOrder = orderBook.createOrder({
        type: OrderType.LimitSell,
        shares: askShares,
        price: askPrice
      });
    }

    describe('by matching one previous ask order', () => {
      describe('when the price and shares are the same', () => {
        beforeEach(() => {
          const bidOrder = orderBook.createOrder({
            type: OrderType.LimitBuy,
            shares: askShares,
            price: askPrice,
          });
          orderBook.orders[bidOrder.id].timestamp -= 1;

          postAskOrder();
        });

        describe('when order has been created', () => {
          it('is totally filled in one transaction at same price', () => {
            expect(askOrder.status).toBe(OrderStatus.Filled);
            expect(askOrder.details.shares).toBe(0);
            expect(askOrder.tradeIds.length).toBe(1);
          });

          it('created a trade and updates the matched bid order', () => {
            const trade = orderBook.trades[askOrder.tradeIds[0]];
            expect(trade.shares).toBe(askShares);
            expect(trade.price).toBe(askPrice);

            const bidOrder = orderBook.orders[trade.bidOrderId];
            expect(bidOrder.status).toBe(OrderStatus.Filled);
            expect(bidOrder.details.shares).toBe(0);
            expect(bidOrder.tradeIds.length).toBe(1);
          });

          it('can not be canceled after being totally filled', () => {
            expect(() => orderBook.cancelOrderById(askOrder.id)).toThrow();
          });
        });
      });

      it.todo('can be partially or totally filled with multiple asks in order book and prices');
    });
  });
});
