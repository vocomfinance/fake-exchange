import Exchange from "./src/Exchange";

const e = new Exchange([
  {
    id: 'fake',
    name: 'Fake Company Inc',
    stock_symbol: 'FAKE',
    currency: 'USD',
  },
]);

e.start();
