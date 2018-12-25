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

### `queries.raw`

The `queries.raw` function takes a query object and returns the desired output.

1. `document` is the object you want to query
1. `query` is an array of path items
1. `latest` is `true` or `false` depending on if you want to get __latest value

It relies on async generators for returning results. These values can be iterated over and resolved like with any async generator. Using `await` is always required because there may be links in the document to follow.

```js
const { queries } = require('moveablejson')

// The document we want to query
const document = {
  foo: {
    baz: {
      bar: 'biz'
    }
  }
};

// Result will be 'biz'
const result = await queries.raw({
  document,
  query: ['foo', 'baz', 'bar']
});
```

You can also look for the latest properties to be able to evolve.

```js
const { queries } = require('moveablejson')

// The document where we have the old and new values
// Latest looks for the name ending with __latest
// It will fallback to the property without __latest if it can't find it
const document = {
  foo: {
    bar: 1,
    bar__latest: true
  }
};

// Result will be ['true']
const result = await queries.raw({
  document,
  query: ['foo', 'bar'],
  latest: true
});
```

### Web Aware with RESTful JSON

The `raw` query will follow links if it finds one in place of a property. This allows for API responses to evolve without breaking queries.

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
// Result will be ['John']
const result1 = await queries.raw({
  document: {
    "order_number": "1234",
    "customer_url": "/customers/4"
  },
  query: ['customer', 'first_name']
});

// Also will return ['John']
const result2 = await queries.raw({
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

## Future Considerations

This is a first pass at this idea. It would be beneficial to explore ways that clients can provide checks to make sure values are the type they expect. For instance, an `email` value needs to be a string that contains an `@` symbol. The current design here does not explore that yet.

Also, it would be interesting to explore how linked data can be used with this. JSON-LD does a good job of solving this problem as mentioned above, but its complexity keeps it from working in smaller spaces.  Whether JSON-LD can be used along side this, or if a simple vocabulary can be included within this design can be used is another area to research.
