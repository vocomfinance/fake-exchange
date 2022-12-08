import MessageBroker, {IMessageBroker, MessageRpcCommand, MessageRpcReply} from "./MessageBroker";
import OrderBook, { OrderBookEventCallback, IOrderDetails } from "./OrderBook";

interface TradingPair {
  id: string,
  name: string;
  stock_symbol: string;
  currency: string;
}

type OrderBookMap = { [key: string]: OrderBook };

class Exchange {
  tradingPairs: TradingPair[];
  running: boolean;
  orderBooks: OrderBookMap;
  messageBroker: IMessageBroker;

  eventTopic = 'events';

  constructor(tradingPairs: TradingPair[]) {
    this.tradingPairs = tradingPairs;
    this.running = false;
    this.orderBooks = {};
    this.initializeOrderBooksFor(tradingPairs);
    this.messageBroker = new MessageBroker();
  }

  handlerForTradingPair(tradingPair: TradingPair): OrderBookEventCallback {
    return (eventName: string, payload: any) => {
      this.messageBroker.emitEvent(this.eventTopic, {
        event: eventName,
        tradingPair: tradingPair,
        payload: payload
      });
    }
  }

  initializeOrderBooksFor(tradingPairs: TradingPair[]) {
    tradingPairs.forEach((tradingPair) => {
      this.orderBooks[tradingPair.id] = new OrderBook(
        tradingPair, this.handlerForTradingPair(tradingPair)
      );
    });
  }

  async start(host: string, rpcPort: number, eventsPort: number) {
    await this.messageBroker.listen(host, rpcPort, eventsPort, (msg: MessageRpcCommand) => {
      return this.processRpcCall(msg);
    });
  }

  createOrderFor(message: MessageRpcCommand): MessageRpcReply {
    const tradingPairId = message.payload?.tradingPairId;
    const orderBook = this.orderBooks[tradingPairId];
    if (orderBook === undefined) return { error: 'INVALID_TRADING_PAIR_ID' };
    try {
      const order = orderBook.createOrder(message.payload?.orderDetails as IOrderDetails);
      return { response: order }
    } catch (error) {
      return { error: 'CAN_NOT_CREATE_ORDER', errorMessage: error?.toString() }
    }
  }

  executeHandlerForCommand(message: MessageRpcCommand) {
    const unknownHandler = () => ({ error: 'unknown_command', errorMessage: `${message.commandName} is not an accepted command` });
    const commandHandler = {
      ping: () => ({ response: 'pong' }),
      createOrder: () => this.createOrderFor(message),
      getTradingPairs: () => ({ response: this.tradingPairs }),
    }[message.commandName] || unknownHandler;

    return commandHandler() as MessageRpcReply;
  }

  processRpcCall(message: MessageRpcCommand): MessageRpcReply {
    return this.executeHandlerForCommand(message);
  }
}

export default Exchange;
export { TradingPair }
