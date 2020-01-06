# Graphable JSON JS

This is a JavaScript implementation of [Graphable JSON](https://github.com/smizell/graphablejson).

## Install

Run the following to install the library:

```sh
npm install graphablejson
```

There is an example API found `https://graphablejsonapi.glitch.me/orders/1000`. You can also view the [GraphQL example](./examples/graphql-example.js) directory to see how this library can be used.

## Usage

### `gqlQuery`

The `gqlQuery` function is takes a URL and query and retrieves the requested data. Support is limited at this point. It takes a URL and a GraphQL AST and returns an object with async generators. This allows the client to lazily load the data from the API instead of requested all of the URLs at once.

It requires you to have `graphql-js` and something like `graphql-tag` to be able to pass in an AST.

```js
// Expecting the following result for the URL:
// https://graphablejsonapi.glitch.me/examples/example2
//
// {
//   customer_number: "8000",
//   order: [
//     {
//       url: "https://graphablejsonapi.glitch.me/orders/1000",
//       order_number: "1000",
//       total: 150,
//       unit: "USD"
//      }
//   ]
// };

const gql = require('graphql-tag');
const { gqlQuery, utils } = require('graphablejson');

const result = await gqlQuery('https://graphablejsonapi.glitch.me/examples/example2', gql`{
  order {
    order_number
    total
  }
}`);

// expandObject will follow links until the object is full expanded
console.log(await utils.expandObject(await result));
```

This makes use of all the functionality listed below. It will follow links and paginated collections.

## Technical Details

This section gives a look into how the library handles responses.

### Web Aware with RESTful JSON

The library will follow links represented in [RESTful JSON](https://restfuljson.org) if it finds one in place of a property. This allows for API responses to evolve without breaking queries.

Let's say the current document we have is an `order` and looks like:

```js
{
  "order_number": "1234",
  "customer_url": "/customers/4"
}
```

And the customer found at `/customers/4` is:

```js
{
  "first_name": "John",
  "last_name": "Doe",
}
```

The query below will request the data and resolve the link. If the data were included in the first response, it would return it, but since it's linked, it will follow the link to get the data.

```js
const { gqlQuery } = require('graphablejson');
const gql = require('graphql-tag');

const result = gqlQuery('https://example.com', gql`
  order_number
  customer {
    first_name
    last_name
  }
`);
```

### Collections

Additionally, APIs may need to return a partial set of items and let the client request more if necessary by way of pagination. A collection object is used to make this possible. It wraps values with an `$item` property so the JSON can move from values, to arrays, to paginated arrays.

```js
// We'll say the following response is found at http://example.com
// {
//   url: 'https://example.com/customer/4538',
//   order: [
//     {
//       url: 'https://example.com/order/1234',
//       order_number: '1234',
//       total_amount: '$100.00'
//     },
//     {
//       url: 'https://example.com/order/1235',
//       order_number: '1235',
//       total_amount: '$120.00'
//     }
//   ]
// };

// Returns all of the order objects found directly in the object
const result = gqlQuery('https://example.com', gql`
  order {
    order_number
    total_amount
  }
`);
```

Below shows the same values changing to use a collection.

A collection is denoted by the `$item` property. Remember that values can be arrays or single values, so $item can be either an
array of items or a single item.

Here is the customer again, this time with a linked collection of orders.

```js
{
  "url": 'https://example.com/customer/4538',
  "order_url": "http://example.com/orders"
}
```

Here is the first page for the orders.

```js
{
  "url": 'https://example.com/orders?page=1',
  "$item": [
    {
      "url": 'https://example.com/order/1234',
      "order_number": '1234',
      "total_amount": '$100.00'
    },
    {
      "url": 'https://example.com/order/1235',
      "order_number": '1235',
      "total_amount": '$120.00'
    }
  ],
  "next_url": 'https://example.com/orders?page=2'
}
```

And the second page of orders.

```js
{
  url: 'https://example.com/orders?page=2',
  $item: [
    {
      url: 'https://example.com/order/1236',
      order_number: '1236',
      total_amount: '$100.00'
    }
  ],
  prev_url: 'https://example.com/orders?page=1'
}
```

The same query listed above will work for this. It will follow `next_url` links and return each item found in `$item`.

This however is not always the best method as including the items in the collection means we cannot cache individual items. To help, we can use links to each item and let the Graphable JSON client resolve the links. This makes use of the same pattern of linking to values by appending a `_url` to the `$item` property and making each item a separate link.

```js
{
  "order": {
    "url": 'https://example.com/orders?page=1',
    "$item_url": [
      'https://example.com/orders/1234',
      'https://example.com/orders/1235'
    ],
    "next_url": 'https://example.com/orders?page=2'
  }
}
```

[RESTfulJSON]: https://restfuljson.org/
