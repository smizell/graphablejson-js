# Moveable JSON

Moveable JSON is an idea for getting rid of the breaking changes we face with JSON and APIs.

**Note**: this README defines how a JavaScript library might work. The library does not exist yet.

## Overview

Clients break too easily when handling JSON from an API. This is because we strictly define the shape of a JSON and then build clients to rely on the shape. API designers are prevented from evolving the data in ways that allow data models to change shape over time. API designers must plan in advance for properties that may require multiple values later and for values that may change from single values to objects.

Consider this JSON document.

```json
{
  "email": "user1@example.com"
}
```

What happens when we realize that we need multiple email addresses for this single user? The approach may be to add a plural property of `emails` with a type of array.

```json
{
  "email": "user1@example.com",
  "emails": ["user1@example.com"]
}
```

This requires clients to update to use a new type of array and move away from the singular `email` property. The property has to be deprecated or supported forever, which does not allow for the JSON to evolve easily over time. However, what if it wasn't a breaking change to move from a string to an array of strings like below?

```json
{
  "email": ["user1@example.com"]
}
```

This problem is apparent with our tools as well. JSON Schema—though great at validating the shape of objects—creates a rigid contract between the data and the shape of the date. We also see this in tools like JSON Path that request a specific path in a JSON document. If the shape of the JSON document changes in the slightest, the schema invalidates the document and the path fails.

To work toward solving this, we can think of ways in which the JSON can be built so that shape doesn't matter. In this scenario, objects and arrays can be treated as implementation details and can be used when necessary. Clients then write a query stating relationships that it expects and allow the query to freely move through values, arrays, and objects until that query is satisfied.

This pattern is used in many places already. HTML is a common example many face where clients query the document rather than traversing it directly. Clients look for nodes with specific classes or IDs rather than coupling to structure. JSON-LD is also another example. The data is created as a graph and can be expanded when needed. However, there are cases where JSON-LD is too complex for people to use.

Moveable JSON aims to be a simple solution that allows clients to query the JSON regardless of the structure. It allows JSON to move in structure while retaining the relationship of the data. If used correctly, the only breaking changes are when the value types of strings, numbers, or booleans change to a different type of string, number, or boolean. Changing to arrays or objects will not break clients.

## Usage

### `queries.rawPath`

The `queries.rawPath` function takes a query object and returns the desired output.

1. `document` is the object you want to query
1. `query` is an array of path items

It relies on async generators for returning results. These values can be iterated over and resolved like with any async generator. Using `await` is always required because there may be links in the document to follow.

Going back to our example above, our client will not break whether a value is a single value or an array of values.

```js
const { queries } = require('moveablejson')

// The document we want to query
const document1 = {
  email: 'johndoe@example.com'
};

const document2 = {
  email: ['johndoe@example.com']
};

// Result will be ['johndoe@example.com']
const result1 = await queries.rawPath({
  document: document1,
  query: ['email']
});

// Result will also be ['johndoe@example.com']
const result2 = await queries.rawPath({
  document: document2,
  query: ['email']
});
```

This also works recursively with objects and arrays.

```js
const { queries } = require('moveablejson')

// Only uses objects
const document1 = {
  foo: {
    baz: {
      bar: 'biz'
    }
  }
};

// foo is now an array of objects
const document2 = {
  foo: [
    {
      baz: {
        bar: 'biz'
      }
    }
  ]
};

// Result will be 'biz'
await queries.rawPath({
  document: document1,
  query: ['foo', 'baz', 'bar']
});

// Result will be also be 'biz'
await queries.rawPath({
  document: document2,
  query: ['foo', 'baz', 'bar']
});
```

### Web Aware with RESTful JSON

The `rawPath` query will follow links represented in [RESTful JSON](https://restfuljson.org) if it finds one in place of a property. This allows for API responses to evolve without breaking queries.

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

The query below will result in the correct `first_name`.

```js
const { queries } = require('moveablejson')

// Result will be ['John']
const result1 = await queries.rawPath({
  document: {
    "order_number": "1234",
    "customer_url": "/customers/4"
  },
  query: ['customer', 'first_name']
});

// Also will return ['John']
const result2 = await queries.rawPath({
  document: {
    "order_number": "1234",
    "customer": {
      "first_name": "John",
      "last_name": "Doe",
    }
  },
  query: ['customer', 'first_name']
});
```

### Collections

Additionally, APIs may need to return a partial set of items and let the client request more if necessary by way of pagination. A collection object is used to make this possible. It wraps values with an `$item` property so the JSON can move from values, to arrays, to paginated arrays.

```js
const query = new Query().select('order.order_number').values();

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

// Returns ['1234', '1235']
await queries.rawPath({
  document: doc1,
  query: ['order', 'order_number']
});
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
const doc2 = {
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

// This will return ['1234', '1235', '1236']
await queries.rawPath({
  document: doc2,
  query: ['order', 'order_number']
});
```

Combining `$item` with RESTful JSON lets collections provide several links to other values, allowing API designers to reduce collection size so that each item can be requested and cached individually.

```js
const doc3 = {
  order: {
    url: 'https://example.com/orders?page=1',
    $item_url: [
      'https://example.com/orders/1234',
      'https://example.com/orders/1235'
    ],
    next_url: 'https://example.com/orders?page=2'
  }
};

// This will return ['1234', '1235', '1236'] if the resources are the same as above.
await queries.rawPath({
  document: doc3,
  query: ['order', 'order_number']
});
```

### `queries.rawShape`

The `rawShape` query allows for defining a structure to find in the API. Where `rawPath` allows for returning a single value, `rawShape` allows for returning many values and on nested objects. It uses `rawPath` for getting values, so links and collections work as defined above.

```js
const { queries } = require('moveablejson')

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

await queries.rawShape({
  document,
  query
});
```

Each property will be a generator to allow for one or many values
