# Cash-link

Service for sending cash to Payment Pointers through sharable links!

Created with help from [this tutorial](https://medium.com/swlh/create-an-api-rest-with-nestjs-1954723e8234).

## Installation

```bash
$ npm install
```

## Running the app

```bash
# copy environment variables
cp template.env .env

# start postgres database
docker run -d -p 5444:5432 -e POSTGRES_PASSWORD=dbPassword -e POSTGRES_DB=cashlink postgres

# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod

# then, open http://localhost:3000/token/eyJhbW91bnQiOjEwLCJpZCI6InNvbWVpRCJ9
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
