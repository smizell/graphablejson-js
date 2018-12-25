const axios = require('axios');
const _ = require('lodash');

exports.raw = async function* raw({ document, query, latest = false }) {
  // TODO: test for part undefined
  // TODO: throw on everything except object

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
      yield* await raw({
        document: document[key],
        query: restQuery,
        latest
      })
    }

    else if (`${key}_url` in document || `${key}Url` in document) {
      let keyName = `${key}_url` in document ? `${key}_url` : `${key}Url`;

      // TODO: needs error handling
      let url = document[keyName];
      let resp = await axios.get(url);

      yield* await raw({
        document: resp.data,
        query: restQuery,
        latest
      });
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
