interface TradingPair {
  name: string;
  stock_symbol: string;
  currency: string;
}

class Exchange {
  tradingPairs: TradingPair[];

  constructor() {}
}

export default Exchange;
export { TradingPair }
