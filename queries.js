const axios = require('axios');
const _ = require('lodash');

exports.raw = raw = async function* raw({ document, query }) {
  // TODO: test for part undefined
  // TODO: throw on everything except object

  if (_.isPlainObject(document)) {
    const [key, ...restQuery] = query;

    // Handle included collections
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

    else if (hasLink(document, '$item')) {
      yield* await followLink(document, '$item', query);

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
  // TODO: needs error handling
  const linkName = getLinkName(document, key);
  const link = document[linkName];

  if (_.isArray(link)) {
    for (let item of link) {
      let resp = await axios.get(item);
      yield* await raw({
        document: resp.data,
        query
      });
    }
  }

  else {
    let resp = await axios.get(link);
    yield* await raw({
      document: resp.data,
      query
    });
  }
}
