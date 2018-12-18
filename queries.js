const _ = require('lodash');

exports.raw = function raw({ document, query, select }) {
  return rawRecursive({ document, query, select, shallow: false });
}

function rawRecursive({ document, query, select }) {
  const [part, ...restQuery] = query;
  let newValue;

  // TODO: test for part undefined
  // TODO: throw on everything except object
  // TODO: cleanup logic as there is duplication

  if (_.has(document, part)) {
    newValue = _.get(document, part);

    // If it's a plain object, we can move on no matter if it's select for
    // 'value' or 'values'.
    if (_.isPlainObject(newValue)) {
      return rawRecursive({
        document: newValue,
        query: restQuery,
        select
      });
    }

    if (_.isArray(newValue)) {
      let results = [];

      for (let i = 0; i < newValue.length; i++) {
        let current = newValue[i];
        let value;

        // Objects need to be recursed, arrays need to throw an error, and all
        // other values can just be added directly to the results array. 
        //
        // TODO: throw on error
        if (_.isPlainObject(current)) {
          value = rawRecursive({
            document: current,
            query: restQuery,
            select
          });
        } else {
          value = current;
        }

        // No need to continue the looping if we only need one value
        if (select === 'value') {
          return value;
        }

        results.push(value);
      }

      return _.flatten(results);
    }

    if (select === 'values') {
      return [newValue];
    }

    if (select === 'value') {
      return newValue;
    }
  }
}
