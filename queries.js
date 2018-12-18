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

    if (select === 'value') {
      if (_.isArray(newValue)) {
        let first = newValue[0];

        // TODO: throw when first is array

        if (_.isPlainObject(first) && !done) {
          return rawRecursive({
            document: first,
            query: restQuery,
            select
          });
        }

        return newValue[0];
      }

      return newValue;
    }

    if (select === 'values') {
      if (_.isArray(newValue)) {
        // TODO: throw if any items are arrays

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

          // TODO: throw if done because we don't want objects
        }

        // TODO: throw if all items are not of same type?

        return newValue;
      }

      return [newValue];
    }

    // TODO: throw error for unknown select
  }
}
