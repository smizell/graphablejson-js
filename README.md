# Moveable JSON

Moveable JSON is an idea for getting rid of the breaking changes we face with JSON and APIs.

## Overview

Moveable JSON starts with the idea that clients shouldn't care if there are one ore many values for a property. This allows properties to evolve from a single value like a string to many values like an array of strings. It then builds upon this idea by allowing values to be links. This lets an API change a property from one included in a response to one that is linked. The client shouldn't care whether those values are included or linked.

## Usage

### `getProperty`

The `queries.getProperty` function takes a object and property and returns the values for the property. It will always return a generator, so if a property is a single value or array of values, it will be treated as a generator.

Going back to our example above, our client will not break whether a value is a single value or an array of values.

```js
const { getProperty } = require('moveablejson')

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
const { getProperty } = require('moveablejson')

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

### `getShape`

The `getShape` query allows for defining a structure to find in the API. Where `getProperty` allows for returning a single value, `getShape` allows for returning many values and on nested objects. It uses `getProperty` for getting values, so links and collections work as defined above.

```js
const { getShape } = require('moveablejson')

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

const result = await getShape({
  document,
  query
});
```

Each property will be a generator to allow for one or many values. This allows for getting properties throughout a document and even throughout an API.
