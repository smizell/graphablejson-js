const _ = require('lodash');

exports.raw = function raw({ document, query, select }) {
  return rawRecursive({ document, query, select, shallow: false });
}

function rawRecursive({ document, query, select }) {
  const [part, ...restQuery] = query;
  const done = restQuery.length === 0;
  let newValue;

  // TODO: test for part undefined
  // TODO: throw on everything except object

  // We expect an object
  if (_.has(document, part)) {
    newValue = _.get(document, part);

    if (select === 'value') {
      if (_.isArray(newValue)) {
        let first = newValue[0];

        // TODO: throw on array

        if (_.isPlainObject(first) && !done) {
          return rawRecursive({
            document: first,
            query: restQuery,
            select
          });
        }

        return newValue[0];
      }

      if (_.isPlainObject(newValue)) {
        return rawRecursive({
          document: newValue,
          query: restQuery,
          select
        });
      }

      return newValue;
    }

    if (select === 'values') {
      if (_.isArray(newValue)) {
        // TODO: throw if any items are arrays

        // TODO: Queries can only go one level into Plain objects if the value
        // isn't an array. This needs to be fixed so that an error is thrown
        // when it's nested arrays.
        if (_.every(newValue, _.isPlainObject)) {
          if (!done) {

            const results = newValue.map((item) => {
              return rawRecursive({
                document: item,
                query: restQuery,
                select: 'values'
              });
            });

            return _.flatten(results);
          }
          // TODO: throw if done
        }

        // TODO: throw if all items are not of same type

        return newValue;
      }

      if (_.isPlainObject(newValue)) {
        return rawRecursive({
          document: newValue,
          query: restQuery,
          select
        });
      }

      return [newValue];
    }

    // TODO: throw error for unknown select
  }
}
