import MessageBroker, {IMessageBroker, MessageRpcCommand, MessageRpcReply} from "./MessageBroker";
import OrderBook, { OrderBookEventCallback } from "./OrderBook";

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

  async start() {
    await this.messageBroker.listen('127.0.0.1', 3000, 3001, (msg: MessageRpcCommand) => {
      return this.processRpcCall(msg);
    });
  }

  processRpcCall(message: MessageRpcCommand): MessageRpcReply {
    return {
      response: {
        text: `we getting your command: ${message.commandName}`
      }
    }
  }
}

export default Exchange;
export { TradingPair }
