const { queries } = require('moveablejson');
const apiUrl = 'https://moveablejsonapi.glitch.me';

// Allow for changing examples through command line
const example = process.argv[2] || 'example1';

// Same query for every example to show it doesn't break
const query = ['order', 'order_number'];

async function api() {
  // All examples are in the same API, so we just prepend that to the query
  const results = queries.followLink(apiUrl, [example, ...query]);

  for await (let result of results) {
    console.log(result);
  }
}

api();
