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
        const linkName = getLinkName(document, 'next');
        const link = document[linkName];

        if (_.isArray(link)) {
          for (let item of link) {
            yield* await followLink(item, query);
          }
        }

        else {
          yield* await followLink(link, query);
        }
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
      const linkName = getLinkName(document, key);
      const link = document[linkName];

      if (_.isArray(link)) {
        for (let item of link) {
          yield* await followLink(item, restQuery);
        }
      }

      else {
        yield* await followLink(link, restQuery);
      }
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

async function* followLink(url, query) {
  // TODO: needs error handling
  let resp = await axios.get(url);

  yield* await raw({
    document: resp.data,
    query
  });
}
