const _ = require('lodash');

exports.raw = function raw({ document, query, select, latest = false }) {
  const [part, ...restQuery] = query;
  let results = [];
  let newValue;

  // TODO: test for part undefined
  // TODO: throw on everything except object
  // TODO: cleanup logic as there is duplication

  // If the user is looking for the special __latest value, we'll look for it first.
  if (latest && restQuery.length === 0 && _.has(document, `${part}__latest`)) {
    return raw({
      document,
      query: [`${part}__latest`, ...restQuery],
      select,
      latest
    })
  }

  if (_.has(document, part)) {
    newValue = _.get(document, part);

    // If it's a plain object, we can move on no matter if it's select for
    // 'value' or 'values'. We will recurse until we find a value or array.
    if (_.isPlainObject(newValue)) {
      results.push(raw({
        document: newValue,
        query: restQuery,
        select,
        latest
      }));
    }

    else if (_.isArray(newValue)) {
      // TODO: checks for types, like if all types are the same or if there are
      // arrays within the array, which results in an error.

      for (let i = 0; i < newValue.length; i++) {
        let current = newValue[i];

        if (_.isPlainObject(current)) {
          results.push(raw({
            document: current,
            query: restQuery,
            select,
            latest
          }));

          continue;
        }

        // No special processing for the type, so we include current value
        results.push(current);

        // No need to continue if we only need one value
        if (select === 'value') break;
      }
    }

    else {
      // No matches were found, so we just use the value
      results.push(newValue);
    }

    const flatResults = _.flatten(results);
    if (select === 'values') return flatResults;
    return flatResults[0]; // return the first value for 'value' query
  }

}
