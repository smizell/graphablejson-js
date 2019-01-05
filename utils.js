const _ = require('lodash');

// Convert an async generator into an array
exports.expandValues = expandValues = async function expandValues(gen) {
  let items = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items
}

exports.expandObject = async function expandObject(obj) {
  const result = {};

  for (let key in obj) {
    let value = obj[key];

    // For now assume anything that isn't an array is a generator
    if (!_.isPlainObject(value)) {
      result[key] = await expandValues(value);
    }
    else {
      result[key] = await expandObject(value);
    }
  }

  return result;
}
