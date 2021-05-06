# Oasis Borrow Cache

Set of packages for providing data about Oasis Borrow.

### Usage

For cache (ETL powered by Spock) run:

- `yarn start-etl` — starts whole etl process
- `yarn migrate` - migrates database
- `yarn start-data-check` - starts data check
- `yarn start-api` - starts Graphql api

For Rest API run:

- `yarn start` - starts REST API (Price Feed API)

## To update e2e snapshots:

1. Ensure that you're running a desired localnode version locally.
2. You might want to update localnode's SHA in circleci config.
3. Run `yarn test:e2e:fix`