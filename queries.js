const axios = require('axios');
const _ = require('lodash');

exports.rawShape = rawShape = async function rawShape({ document, query }) {
  const result = {};

  for (let path of query.properties || []) {
    result[path] = rawPath({ document, query: [path] });
  }

  for (let key in query.related || {}) {
    let valueGen = rawPath({ document, query: [key] });
    let relatedDoc = (await valueGen.next()).value;
    result[key] = await rawShape({
      document: relatedDoc,
      query: query.related[key]
    });
  }

  return result;
}

exports.rawPath = rawPath = async function* rawPath({ document, query = [] }) {
  if (_.isPlainObject(document)) {
    const [key, ...restQuery] = query;

    // There are no more paths to traverse. We can return the object.
    if (key === undefined) {
      yield document;
    }

    // Collections are denoted by objects that have an `$item` property.
    else if ('$item' in document) {
      yield* rawPath({
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
      yield* rawPath({
        document: document[key],
        query: restQuery
      });
    }

    // If a properties isn't found, we can look for a link with the same name.
    else if (hasLink(document, key)) {
      yield* followDocumentLinks(document, key, restQuery);
    }
  }

  else if (_.isArray(document)) {
    for (let i in document) {
      yield* rawPath({
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
  yield* rawPath({ document: urlProp });
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
  yield* rawPath({
    document: resp.data,
    query
  });
}
