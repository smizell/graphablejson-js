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
1. `select` is either `value` or `values` depending on if you expect one versus more results
1. `latest` is `true` or `false` depending on if you want to get __latest value

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
const result = queries.raw({
  document,
  query: ['foo', 'baz', 'bar'],
  select: 'value'
});
```

You can also look for the latest properties to be able to evolve.

```js
const { queries } = require('moveablejson')

// The document where we have the old and new values
const document = {
  foo: {
    bar: 1,
    bar__latest: true
  }
};

// Result will be 'true'
const result = queries.raw({
  document,
  query: ['foo', 'bar'],
  select: 'value',
  latest: true
});
```

## Usage (Not Implemented)

None of the API has been implemented. It is left here for the sake of exploring what this Moveable JSON idea could do.

### Selecting a Single Value

At minimum, a select will return a single value it finds in an object.

```js
const query = new Query().select('foo');

const doc = new Document({
  foo: 'baz'
});

// Returns 'baz'
query.value().run(doc); 
```

Even though the example below is now an array of strings rather than a single string, the query above will still work. That's because it will return the first value it sees in an array. This allows values to move from single values to multiple values.

The `.values` call can be used to get all of the values. This will always return an array, even if the value is a single value like the example above. This also means arrays can move to single values without breaking queries.

```js
const query = new Query().select('foo');

const doc = new Document({
  foo: ['baz', 'bar']
});

// Always returns the single value, even if there are many
// Returns 'baz'
query.value().run(doc); 

// Calling .values() let's us get every 'foo' value
// Returns ['baz', 'bar']
query.values().run(doc); 
```

### Nested Queries

Like with above, a query shouldn't break just because a property's value switches from a single object to multiple objects. Running `.value` on a query will either give you the direct value or the value of the first object found in an array. 

Related, running `.values` will always give you a list, even if the value is found directly nested in an object.

```js
const query = new Query().select('foo.baz');

// foo here is a single object
const doc1 = new Document({
  foo: {
    baz: 1
  }
});

// foo here is an array of the same type of object
const doc1 = new Document({
  foo: [
    {
      baz: 1
    },
    {
      baz: 2
    },
  ]
});

// Both will return 1 because we use .value()
// This is because it will either get the first value it finds or the first
// value in an array.
query.value().run(doc1);
query.value().run(doc2);

// Calling values will always return an array, even if the value found is
// not in an array. This means the JSON can can contain one or many of the
// desired values.

// Returns [1]
query.values().run(doc1);

// Returns [1, 2]
query.values().run(doc1);
```

### Changing Types and Evolving Clients and Servers

There are instances where a property needs to change a type that is not an array or object, which would result in a breaking change. To fix this, properties can be deprecated and live alongside new values. By default, the client should use the deprecated value unless specified otherwise. 

The `__latest` is special because it can set alongside existing values. It allows us to use `selectLatest` when we want to move to a new property. If the value with `__latest` is not there, it will revert back to the plain value. This allows clients and servers to be evolved in situations where types have to change.

```js
const query1 = new Query().select('active').value();

// In the first design, we used 1 and 0 for true or false respectably.
const doc1 = new Document({
  active: 1
});

// Returns 1
query1.run(doc1);

// Now we change it to include two values
const doc2 = new Document({
  active: 1,
  active__latest: true
});

// Still returns 1 because it gets deprecated as default
query1.run(doc2);

// Now we use selectLatest for the query to pick active__latest or
// fall back to active if active__latest isn't there.
const query2 = new Query().selectLatest('active').value();

// Now this gets value true
query2.run(doc2);

// Once clients have moved on, we remove the latest value
const doc2 = new Document({
  active: true
});

// Even though it's looking for active__latest, it will fall back to the active
// property. The client can later be updated and the query can be changed back
// to use plain select.
query2.run(doc2);
```

### Handling Query Errors

When the query encounters a `null` or undefined for a query, it will throw an error. This is because the query will not know how you intend on handling values like these. An error is thrown because it means that something your client depends on is not available. This means that all queries should be wrapped in a try/catch or default values should always be provided.

THe `default` option may be used to specify what to do if `null` or the value is undefined.

```js
const query = new Query().select('foo');

const doc = new Document({
  foo: null
});

// Throws type error because of null
// Same would be true if it's undefined
query.value().run(doc); 

// Returns 'bar'
query.value({ default: 'bar' }).run(doc); 
```

When the query results an object, it will also throw an error. This is because the query is expecting you to return a single value. If an object is found on run, the query will throw an error.

The `default` option can be used to specify what to do if an object is found.

```js
const query = new Query().select('foo');

const doc = new Document({
  foo: {
    baz: 'bar'
  }
});

// Throws type error because it gets an object
query.value().run(doc); 
```

## Making JSON Web Aware

Moveable JSON relies on [RESTful JSON](https://restfuljson.org) as a pattern for including links. It is a simple way to include links in JSON, and allow for hyperlinking documents when necessary.

### Following Links

Hyperlinks in RESTful JSON use the following two rules:

1. JSON objects MAY include a `url` property to indicate a link to itself
1. JSON objects MAY append `_url` or `Url` to properties to indicate related links

```js
const query = new Query().select('order.order_number').value();

// Let's say at the order_url below you can find 
// {
//   "url": 'https://example.com/order/1234',
//   "order_number": "1234",
//   "total_amount": "$100.00"
// }
const doc = new Document({
  url: 'https://example.com/customer/2',
  order_url: 'https://example.com/order/1234'
});

// Returns '1234' after following the link
query.run(doc);
```

Note that you can use `__latest` with links as well to move to new resources when necessary.

### Collections

Additionally, APIs may need to return a partial set of items and let the client request more if necessary by way of pagination. A collection object is used to make this possible. It wraps values with an `$item` property so the JSON can move from values, to arrays, to paginated arrays.

```js
const query = new Query().select('order.order_number').values();

const doc1 = new Document({
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
});

// Returns ['1234']
query.run(doc1);

// Below shows the same values changing to use a collection.
//
// A collection is denoted by the $item property
// Remember that values can be arrays or single values, so $item can be either an
// array of items or a single item.
//
// Let's say this is what page 2 might be.
// {
//   url: 'https://example.com/orders?page=2',
//   $item: [
//     {
//       url: 'https://example.com/order/1236',
//       order_number: '1236',
//       total_amount: '$100.00'
//     }
//   ],
//   prev_url: 'https://example.com/orders?page=1'
// }
const doc2 = new Document({
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
query.run(doc2);

// The collection data can be accessed directly
// A type error will result if the collection does not exit
new Query().select('order.$collection').value().run(doc2);
```

Combining `$item` with RESTful JSON lets collections provide several links to other values, allowing API designers to reduce collection size so that each item can be requested and cached individually.

```js
const doc2 = new Document({
  order: {
    url: 'https://example.com/orders?page=1',
    $item_url: [
      'https://example.com/orders/1234',
      'https://example.com/orders/1235'
    ],
    next_url: 'https://example.com/orders?page=2'
  }
});
```

## Building Documents

Just like querying should not break because the shape changes, building documents should not be about the shape but rather the relationship of data.

In the example below, it shows we relate date throughout the document, but we never have to worry about the shape of the resulting JSON. We can only ignore the shape if the client can deal with the way we ignore shape, which we are doing in how we query above. 

```js
const doc = new Document();

doc.set('name', 'Jane Doe'); // { "name": "Jane Doe" }
doc.set('name', 'John Doe'); // { "name": ["Jane Doe", "John Doe"] }

// Add a sub document
const car1 = doc.subDocument('car'); // value isn't changed until we add values
car.set('make', 'Ford'); 
// Value includes a car document
// { 
//   "name": ["Jane Doe", "John Doe"], 
//   "car": { "make": "Ford" }
// }
const car2 = doc.subDocument('car'); // value isn't changed until we add values
car2.set('make', 'Toyota'); 
// The document now includes two cars
// { 
//   "name": ["Jane Doe", "John Doe"], 
//   "car": [
//     { "make": "Ford" },
//     { "make": "Toyota" }
//   ]
// }

// Serialize to JSON now
const jsonValue = new JSONSerializer().serialize(doc);
```

## Future Considerations

This is a first pass at this idea. It would be beneficial to explore ways that clients can provide checks to make sure values are the type they expect. For instance, an `email` value needs to be a string that contains an `@` symbol. The current design here does not explore that yet.

Also, it would be interesting to explore how linked data can be used with this. JSON-LD does a good job of solving this problem as mentioned above, but its complexity keeps it from working in smaller spaces.  Whether JSON-LD can be used along side this, or if a simple vocabulary can be included within this design can be used is another area to research.
