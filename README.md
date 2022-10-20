# Oasis Borrow cache

This package parses blockchain data and builds comprehensive data set about Maker Vaults used by
Oasis Borrow. To build most up to date live data project utilizes
[Spock 🖖](https://github.com/OasisDEX/spock).

<REFERENCE HERE SPOCK LEARNING MATERIALS>

## Project brake down

- `etl` process handles fetching data from blockchain, processes it and saves to data base.
- `api` process creates readonly graphql api from database views.

## Getting Started

Requirements:

- Docker
- node.js (version 12.\*)
- yarn

1. Clone the repository

   ```bash
   git clone https://github.com/OasisDEX/oasis-borrow-cache.git
   ```

2. Install dependencies
   ```bash
   yarn
   ```
3. Create `.env.local` in the root of the project with content to set/override environment
   variables. In order to create borrow history you will need to supply an url to jsonrpc node.

   Here you may also override `VL_CHAIN_NAME=mainnet`. You may set it to `mainnet` or `kovan` or
   `localnet` but remember to also provide proper jsonrpc node (taken from
   [alchemy](https://www.alchemy.com/) or [infura](https://infura.io/)).

   ```
   VL_CHAIN_HOST= <HERE PASTE AN URL TO JSONRPC NODE FROM WHERE YOU WISH TO FETCH BLOCKCHAIN DATA>
   ```

   It is also possible to override vat starting block (there are defaults within config files). To
   do so use `GENESIS=<HERE PASTE STARTING BLOCK NUMBER>` variable.

4. Run database
   ```bash
   ./scripts/dev.sh
   ```
5. Run migrations
   ```
   yarn migrate
   ```
   NOTE: Use node version 12
6. Run `etl` process
   ```
   yarn start-etl
   ```
   NOTE: Use node version 12
7. Run `api` process
   ```
   yarn start-api
   ```

## Database structure

### Schema: `cat` [contract source](https://github.com/makerdao/dss/blob/master/src/cat.sol)

- `bite` - Holds pure Bite events emitted by Cat.

### Schema: `clipper` [contract source](https://github.com/makerdao/dss/blob/master/src/clip.sol)

- `kick` - Holds pure Kick events emitted by clippers. Event starting vault auction.
- `redo` - Holds pure Redo events emitted by clippers. Event restarting auction.
- `take` - Holds pure Take events emitted by clippers. Event when collateral is bought at the
  auction.
- `yank` - Holds pure Yank events emitted by clippers.

### Schema: `dog` [contract source](https://github.com/makerdao/dss/blob/master/src/dog.sol)

- `bark` - Holds pure Bark events emitted by Dog

### Schema: `flipper` [contract source](https://github.com/makerdao/dss/blob/master/src/flip.sol)

- `kick` - Holds pure kick function calls on flippers.
- `deal` - Holds pure deal function calls on flippers.
- `dent` - Holds pure dent function calls on flippers.
- `tend` - Holds pure tend function calls on flippers.

### Schema: `manager` [contract source](https://github.com/makerdao/dss-cdp-manager/blob/master/src/DssCdpManager.sol)

- `cdp` - Holds information about vaults open via cdp manager.

### Schema: `vat` [contract source](https://github.com/makerdao/dss/blob/master/src/vat.sol) [MakerDAO docs](https://docs.makerdao.com/smart-contract-modules/core-module/vat-detailed-documentation)

- `fold` - Holds pure fold function calls on vat. Updates rates for ilk.
- `fork` - Holds pure fork function calls on vat. Moves collateral and debt between vaults.
- `frob` - Holds pure frob function calls on vat. This call does debt and collateral changes on
  vault.
- `grab` - Holds pure grab function calls on vat. Confiscates vault on liquidation.

### Schema: `vault`

- `events` - Aggregated events for vaults. Transformed from events or function calls. The values
  stored here are normalized.

Note: values saved from pure events or function calls are not normalized, they need to be divided by
`wad` `rad` or `ray`. [Read more](https://docs.makerdao.com/other-documentation/system-glossary)

- `multiply_events` - Aggregated multiply events, transformed from `vault.events` (called
  standard_events) and events dispatched by MPA contract and exchange.

Note: debt and before_debt is stored in normalized form, to get to exact debt at the time of the
event it needs to be multiplied by rate.

## Unit tests

- For running tests you also need node v12 <DESCRIBE UNIT TESTS>

## Development notes

- Every bit of information saved to db needs to be referenced by block and transaction so when the
  reorg happens spock can remove such data from database
  ```
  tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  ```
- Remember to lowercase all addresses when saving them.

## Sending messages to AWS SQS
Fill in the required env variables :
  - `AWS_ACCESS_KEY_ID=`
  - `AWS_SECRET_ACCESS_KEY=`
  - `AWS_REGION=`
  - `AWS_SQS=local`

To use the queue - import`sendQueueMessage` function and use it where desired - eg `oracleTransformer.ts`.

If no `AWS_SQS` is provided or it is == `local` the messages will not be sent to the queue and will be displayed in the terminal - you can use the debug console to track them.

## Troubleshooting known issues

### Getting EHOSTUNREACH on some ip when running yarn start-etl

This issue is related to IPv6 and happens for some people on some service providers (for ex. UPC in
Poland). Temporary solution to fix it at one
[Linux machine by disabling IPv6](https://www.techrepublic.com/article/how-to-disable-ipv6-on-linux/).
Long term solution, for many devices is to call service provider and ask them to switch off IPv6.

#### Example log for this issue

```
Got 0, {"attempts":15,"method":"getBlock","params":{"blockTag":"0x507b24","includeTransactions":false},"error":{"statusCode":0,"responseText":"Error: connect EHOSTUNREACH 54.205.195.79:443\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1138:16)"}}
› Got error, failing... {"statusCode":0,"responseText":"Error: connect EHOSTUNREACH 54.205.195.79:443\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1138:16)"}
ℹ Releasing lock: 4919                                                                                                                                                       db/utils 10:18:22
› SELECT pg_advisory_unlock(4919); (2 ms)                                                                                                                                          db 10:18:22
ℹ Released lock: 4919                                                                                                                                                        db/utils 10:18:22
Error: invalid response - 0
    at exports.XMLHttpRequest.request.onreadystatechange (/home/johnnie/Projects/oasis-borrow-cache/node_modules/ethers/utils/web.js:84:29)
```

#### Disabling IP6 just on your machine doesn't help?
Call your internet provider to disable it. Alternatively try network shared from mobile or go to other place like office or cafe to try it.