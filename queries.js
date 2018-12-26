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
        yield* followDocumentLinks(document, 'next', query);
      }
    }

    // Like normal properties, the `$item` for collection can be a link or an
    // array of links.
    else if (hasLink(document, '$item')) {
      yield* followDocumentLinks(document, '$item', query);

      // Follow paginated links
      if (hasLink(document, 'next')) {
        yield* followDocumentLinks(document, 'next', query);
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
      yield* followDocumentLinks(document, key, restQuery);
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

async function* getDocumentUrls(document, key) {
  const linkName = getLinkName(document, key);
  const urlProp = document[linkName];
  yield* raw({ document: urlProp });
}

async function* followDocumentLinks(document, key, query) {
  const urls = getDocumentUrls(document, key);
  yield* followLinks(urls, query);
}

// The urls argument should be an AsyncGenerator so that we can handle many URLs
// at once. There may be one or many URLs in a document, so we treat it that
// way.
async function* followLinks(urls, query) {
  for await (let url of urls) {
    yield* followLink(url, query);
  }
}

exports.followLink = followLink = async function* followLink(url, query) {
  let resp = await axios.get(url);
  yield* raw({
    document: resp.data,
    query
  });
}
