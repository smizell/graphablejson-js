const { queries, utils } = require('../..');
const axios = require('axios');
const util = require('util');
const apiUrl = 'https://moveablejsonapi.glitch.me';

// Allow for changing examples through command line
const exampleId = process.argv[2] || 'example1';

async function api() {
  console.log(exampleId)
  const api = await axios.get(apiUrl);
  const example = api.data[exampleId];
  const value = await queries.getShape({
    document: example,
    query: {
      properties: ['customer_number'],
      related: {
        order: {
          properties: ['order_number', 'total']
        }
      }
    }
  });
  const expanded = await utils.expandObject(value);
  console.log(util.inspect(expanded, false, null, true));
}

api();
