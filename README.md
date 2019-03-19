# Graphable JSON

Graphable JSON is an idea for using GraphQL with a REST API. GraphQL allows client developers to define only what they need and the API responds with the requested data. Graphable JSON is similar in that it allows client developers to specify the shape of data. It differs in that it will provide the requested data by following links and paginated collections to get the data.

Though this does not solve the problem of overfetching, it does let client developers forget about resources, URLs, and HTTP requests—they ask for what they need and that's all. For API developers, it lets them evolve their API without fear of breaking the client.

## How it works

When a URL and query are given to the Graphable JSON client, the library will request the URL and look for the properties and related objects directly included that response. If they are there, it returns the values it found. If the properties are links instead of values by way [RESTful JSON][RESTfulJSON], it will follow those links and provide the response values. If the links are for [collections](#Collections), it will follow `next` links and return all of the items from the collections.

This library makes use of asynchronous generators. This means the library will not follow all of the links it finds but rather follow them only when the client asks for the next item. The data will be lazily resolved so only the used data will be requested. This allows API developers to convert values into links to help clients make use of caching and reduce response sizes. The smaller the responses, the better.

Lastly, Graphable JSON allows for thinking about relationships rather than JSON structures. For example, a customer may have an `email` relationship, and this could mean there are no emails, one email, or many emails. The Graphable JSON library will treat the following examples of a customer the same.

```js
// No email
{}

// Email is null
{ "email": null }

// One email
{ "email": "jdoe@example.com" }

// Multiple emails
{ "email": [ "jdoe@example.com", "jdoe2@example.com" ] }
```

This works because of the use of generators. When it's undefined or `null`, the library will never yield a value for `email`. When there is one, it will yield one `email`. And when there is an array, it will yield each one individually.

## Usage

Run the following to install the library:

```sh
npm install graphablejson
```

### `gqlQuery`

The `gqlQuery` function is takes a URL and query and retrieves the requested data. Support is limited at this point. It takes a URL and a GraphQL AST and returns an object with async generators. This allows the client to lazily load the data from the API instead of requested all of the URLs at once.

It requires you to have `graphql-js` and something like `graphql-tag` to be able to pass in an AST.

```js
// Expecting the following result for the URL:
// https://graphablejsonapi.glitch.me/orders/1000
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

const { gqlQuery, utils } = require('graphablejson');
const result = await gqlQuery('https://graphablejsonapi.glitch.me/orders/1000', gql`{
  customer_number
  order {
    order_number
    total
  }
}`);
// expandObject will follow links until the object is full expanded
console.log(await utils.expandObject(await result))
```

This makes use of all the functionality listed below. It will follow links and paginated collections.

### `getProperty`

The `queries.getProperty` function takes a object and property and returns the values for the property. It will always return a generator, so if a property is a single value or array of values, it will be treated as a generator.

Going back to our example above, our client will not break whether a value is a single value or an array of values.

```js
const { getProperty } = require('graphablejson')

// The document we want to query
const document1 = {
  email: 'johndoe@example.com'
};

const document2 = {
  email: ['johndoe@example.com']
};

// Result will be ['johndoe@example.com']
const result1 = await getProperty(document1, 'email');

// Result will also be ['johndoe@example.com']
const result2 = await getProperty(document2, 'email');
```

### Web Aware with RESTful JSON

The `getProperty` query will follow links represented in [RESTful JSON](https://restfuljson.org) if it finds one in place of a property. This allows for API responses to evolve without breaking queries.

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

The query below will result in the response for `/customers/4`.

```js
const { getProperty } = require('graphablejson')

const result1 = await getProperty({
  "order_number": "1234",
  "customer_url": "/customers/4"
}, 'customer');

// This will be the same value as above, just without the API request
const result2 = await getProperty({
  "order_number": "1234",
  "customer": {
    "first_name": "John",
    "last_name": "Doe",
  }
}, 'customer');
```

### Collections

Additionally, APIs may need to return a partial set of items and let the client request more if necessary by way of pagination. A collection object is used to make this possible. It wraps values with an `$item` property so the JSON can move from values, to arrays, to paginated arrays.

```js
const doc1 = {
  url: 'https://example.com/customer/4538',
  order: [
    {
      url: 'https://example.com/order/1234',
      order_number: '1234',
      total_amount: '$100.00'
    },
    {
      url: 'https://example.com/order/1235',
      order_number: '1235',
      total_amount: '$120.00'
    }
  ]
};

// Returns all of the order objects found directly in the object
await getProperty(document1, 'order');
```

Below shows the same values changing to use a collection.

A collection is denoted by the `$item` property. Remember that values can be arrays or single values, so $item can be either an
array of items or a single item.

Let's say this is what page 2 might be.

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

Here is the collection now where the second page is linked with `next_url`.

```js
const document2 = {
  url: 'https://example.com/customer/4538',
  order: {
    url: 'https://example.com/orders?page=1',
    $item: [
      {
        url: 'https://example.com/order/1234',
        order_number: '1234',
        total_amount: '$100.00'
      },
      {
        url: 'https://example.com/order/1235',
        order_number: '1235',
        total_amount: '$120.00'
      }
    ],
    next_url: 'https://example.com/orders?page=2'
  }
});

// Returns all of the orders found in the collection.
await getProperty(document2, 'order');
```

Combining `$item` with RESTful JSON lets collections provide several links to other values, allowing API designers to reduce collection size so that each item can be requested and cached individually.

```js
const document3 = {
  order: {
    url: 'https://example.com/orders?page=1',
    $item_url: [
      'https://example.com/orders/1234',
      'https://example.com/orders/1235'
    ],
    next_url: 'https://example.com/orders?page=2'
  }
};

// Follows all of the $item_url values and returns the orders
await getProperty(document3, 'order');
```

### `rawQuery`

The `rawQuery` query allows for defining a structure to find in the API. Where `getProperty` allows for returning a single value, `rawQuery` allows for returning many values and on nested objects. It uses `getProperty` for getting values, so links and collections work as defined above.

```js
const { rawQuery } = require('graphablejson')

// The document we want to query
const document = {
  name: 'John Doe',
  email: 'johndoe@example.com'
  address: {
    street: '123 Main St.',
    city: 'New York',
    state: 'NY',
    zip: '10101'
  }
};

const query = {
  properties: ['name', 'email'],
  related: {
    address: {
      properties: ['street', 'city', 'state', 'zip']
    }
  }
}

const result = rawQuery(document, query);
```

Each property will be a generator to allow for one or many values. This allows for getting properties throughout a document and even throughout an API.

[RESTfulJSON]: https://restfuljson.org/
