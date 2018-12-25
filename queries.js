const _ = require('lodash');

exports.raw = function* raw({ document, query, latest = false }) {
  const [part, ...restQuery] = query;
  let newValue;

  // TODO: test for part undefined
  // TODO: throw on everything except object
  // TODO: cleanup logic as there is duplication

  // If the user is looking for the special __latest value, we'll look for it first.
  if (latest && _.has(document, `${part}__latest`)) {
    yield* raw({
      document,
      query: [`${part}__latest`, ...restQuery],
      latest
    });
  }

  else if (_.has(document, part)) {
    newValue = _.get(document, part);

    // If it's a plain object, we can move on no matter if it's select for
    // 'value' or 'values'. We will recurse until we find a value or array.
    if (_.isPlainObject(newValue)) {
      yield* raw({
        document: newValue,
        query: restQuery,
        latest
      });
    }

    else if (_.isArray(newValue)) {
      // TODO: checks for types, like if all types are the same or if there are
      // arrays within the array, which results in an error.

      for (let i = 0; i < newValue.length; i++) {
        let current = newValue[i];

        if (_.isPlainObject(current)) {
          yield* raw({
            document: current,
            query: restQuery,
            latest
          });

          continue;
        }

        // No special processing for the type, so we include current value
        yield current;
      }
    }

    else {
      // No matches were found, so we just use the value
      yield newValue;
    }
  }
}
