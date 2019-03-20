const util = require('util');
const gql = require('graphql-tag');
const { gqlQuery, utils } = require('..');

async function main() {
  // Allow for changing examples through command line
  const exampleId = process.argv[2] || 'example1';
  const url = `https://graphablejsonapi.glitch.me/examples/${exampleId}`
  const query = gql`{
    customer_number
    order {
      order_number
      total
    }
  }`;
  const value = await gqlQuery(url, query);
  // This resolves all of the links in the response (if there are any)
  const expanded = await utils.expandObject(value);
  console.log(util.inspect(expanded, false, null, true));
}

main();
