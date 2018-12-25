const axios = require('axios');
const _ = require('lodash');

exports.raw = async function* raw({ document, query }) {
  // TODO: test for part undefined
  // TODO: throw on everything except object

  if (_.isPlainObject(document)) {
    const [key, ...restQuery] = query;

    if (key in document) {
      yield* await raw({
        document: document[key],
        query: restQuery
      })
    }

    else if (`${key}_url` in document || `${key}Url` in document) {
      let keyName = `${key}_url` in document ? `${key}_url` : `${key}Url`;

      // TODO: needs error handling
      let url = document[keyName];
      let resp = await axios.get(url);

      yield* await raw({
        document: resp.data,
        query: restQuery
      });
    }
  }

  else if (_.isArray(document)) {
    for (let i in document) {
      yield* raw({
        document: document[i],
        query
      });
    }
  }

  else {
    yield document;
  }
}
