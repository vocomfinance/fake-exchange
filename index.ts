import { env } from "process";
import Exchange from "./src/Exchange";

const e = new Exchange([
  {
    id: 'FAPPL',
    name: 'Fake Apple Inc',
    stock_symbol: 'FAPPL',
    currency: 'USD',
  },
  {
    id: 'FMETA',
    name: 'Fake Meta Inc',
    stock_symbol: 'FMETA',
    currency: 'USD',
  },
]);

console.log('Starting exchange with trading pairs:', e.tradingPairs.map((tp) => tp.id).join(', '));

e.start(
  env.HOST || '127.0.0.1' as string,
  parseInt(env.RPC_PORT as string, 10) || 3000,
  parseInt(env.EVENTS_PORT as string, 10) || 3001
);
