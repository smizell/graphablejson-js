const { queries } = require('moveablejson');


const example = process.argv[2] || 'example1';
const apiUrl = 'https://moveablejsonapi.glitch.me';

// Same query for every example
const query = ['order', 'order_number'];

async function api() {
  const results = queries.followLink(apiUrl, [example, ...query]);

  for await (let result of results) {
    console.log(result);
  }
}

api();
