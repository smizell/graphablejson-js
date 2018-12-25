const _ = require('lodash');

exports.raw = function* raw({ document, query, latest = false }) {
  // TODO: test for part undefined
  // TODO: throw on everything except object
  // TODO: cleanup logic as there is duplication

  if (_.isPlainObject(document)) {
    const [key, ...restQuery] = query;

    // If the user is looking for the special __latest value, we'll look for it first.
    if (latest && `${key}__latest` in document) {
      yield* raw({
        document: document,
        query: [`${key}__latest`, ...restQuery],
        latest
      });
    }

    else if (key in document) {
      yield* raw({
        document: document[key],
        query: restQuery,
        latest
      })
    }
  }

  else if (_.isArray(document)) {
    for (let i in document) {
      yield* raw({
        document: document[i],
        query,
        latest
      });
    }
  }

  else {
    yield document;
  }
}
