# Follow Links

This Moveable JSON library will follow links when it finds them in place of regular properties. This means that if you query for `order` and it's missing, this library will look for `order_url` and resolve the link then continue traversing. 

It will also handle collections, which means if the property and link are not found, it will look for an `$item` property to iterate over. One complete, it will look for a `next` entity, either included or linked as `next_url` or `nextUrl`.

This example shows all of these scenarios. 

* `example1` shows a single embedded order object
* `example2` shows all of the order objects embedded
* `example3` shows `order_url` with links to each order
* `example4` shows `order_url` as a link to a paginated collection

## Usage

A [sample API](https://moveablejsonapi.glitch.me/) has been created for this on Glitch. You can navigate there and see what the API looks like.

1. Clone this repository with `git clone https://github.com/smizell/moveablejson.git`
1. Navigate to this directory `cd moveablejson/examples/follow-links`
1. Install packages with `npm install`
1. Run the example `node index.js example1`
1. Run other examples listed above

If you look at `index.js`, you'll see the query never changes, yet the output is the same for each query. This allows the structure to evolve without breaking clients.
