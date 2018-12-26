const axios = require('axios');
const _ = require('lodash');

exports.raw = raw = async function* raw({ document, query }) {
  // TODO: test for part undefined
  // TODO: throw on everything except object

  if (_.isPlainObject(document)) {
    const [key, ...restQuery] = query;

    // Handle collections
    if ('$item' in document) {
      yield* await raw({
        document: document.$item,
        query
      });

      // Follow paginated links
      if (hasLink(document, 'next')) {
        yield* await followLink(document, 'next', query);
      }
    }

    // Handle direct properties
    else if (key in document) {
      yield* await raw({
        document: document[key],
        query: restQuery
      })
    }

    // Handle linked properties
    else if (hasLink(document, key)) {
      yield* await followLink(document, key, restQuery);
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

function hasLink(document, key) {
  return `${key}_url` in document || `${key}Url` in document;
}

function getLinkName(document, key) {
  return `${key}_url` in document ? `${key}_url` : `${key}Url`;
}

async function* followLink(document, key, query) {
  let linkName = getLinkName(document, key);

  // TODO: needs error handling
  let url = document[linkName];
  let resp = await axios.get(url);

  yield* await raw({
    document: resp.data,
    query
  });
}
