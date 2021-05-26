# Oasis Borrow cache 
This package parses blockchain data and builds comprehensive data set about Maker Vaults used by Oasis Borrow. To gether live data project utilizes [Spock 🖖](https://github.com/OasisDEX/spock).

## Project brake down
- `etl` process handles fetching data from blockchain, processes it and saves to data base.
- `api` process creates readonly graphql api from database views.

## Getting Started

Requirements:
- Docker
- node.js (version 12.*)
- yarn

1. Clone the repository

    ``` bash
    git clone https://github.com/OasisDEX/oasis-borrow-cache.git
    ```
2. Install dependencies
    ``` bash
    yarn
    ```
3. Create `.env.local` in the root of the project with content to set/override environment variables. In order to create borrow history you will need to supply an url to jsonrpc node. 

    Here you may also override `VL_CHAIN_NAME=mainnet`. You may set it to `mainnet` or `kovan` or `localnet` but remember to also provide proper jsonrpc node.  

    ```
    VL_CHAIN_HOST= <HERE PASTE AN URL TO JSONRPC NODE FROM WHERE YOU WISH TO FETCH BLOCKCHAIN DATA>
    ```

4. Run database
    ``` bash
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



Notes:
- Every bit of information saved to db needs to be referenced by block and transaction so when the reorg happens spock can remove such data from database
    ```
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    ```



