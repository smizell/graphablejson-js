const axios = require('axios');
const _ = require('lodash');

exports.raw = raw = async function* raw({ document, query = [] }) {
  if (_.isPlainObject(document)) {
    const [key, ...restQuery] = query;

    // Collections are denoted by objects that have an `$item` property.
    if ('$item' in document) {
      yield* raw({
        document: document.$item,
        query
      });

      // Follow paginated links
      if (hasLink(document, 'next')) {
        yield* followLink(document, 'next', query);
      }
    }

    // Like normal properties, the `$item` for collection can be a link or an
    // array of links.
    else if (hasLink(document, '$item')) {
      yield* followLink(document, '$item', query);

      // Follow paginated links
      if (hasLink(document, 'next')) {
        yield* followLink(document, 'next', query);
      }
    }

    // Handle direct properties
    else if (key in document) {
      yield* raw({
        document: document[key],
        query: restQuery
      })
    }

    // If a properties isn't found, we can look for a link with the same name.
    else if (hasLink(document, key)) {
      yield* followLink(document, key, restQuery);
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

  // TODO: only yield on strings, numbers, and booleans
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
  const urlProp = document[linkName];
  const urls = raw({ document: urlProp });

  // This allows us to handle one or many URLs. We can let the `raw` function
  // return a generator so that we can always loop over the URLs no matter what.
  for await (let url of urls) {
    let resp = await axios.get(url);
    yield* raw({
      document: resp.data,
      query
    });
  }
}
