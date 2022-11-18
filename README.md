# Fake Exchange
A fake exchange intended to be used as an RPC service for test environments.

At this time do not expect a wonderful architecture designed for a long term project.

## What does
- Run an Exchange with multiple OrderBooks for each financial instruments available to be traded.
- Receive, execute/fill, cancel and modify an order simulating a real exchange operative.
- Support for LimitBuy and LimitSell orders.
- Settles orders at min price between matching orders (so it will always benefit buyers).
- Reports publicly the events happening to suscribers

## What doesn't
- No support for authorization or user/client
- Support other orders like Market, Stops...
- Support multiple advanced trades like: KILL_OR_FILL, POST_ONLY, ALL_OR_NONE, etc...
- Keep a Ledger of balances.
- Payments & Settlement
- Uses any external storage

## What is pending to be done
[] Functional trading with 100% coverage.
[] ZeroMQ RPC implementation to deploy the exchange

## Possible Improvements
- Create repositories to manage entities storage.
- Test the fucking event emitter if we find a way to mock a class in FUCKING TYPESCRIPT-JEST.
