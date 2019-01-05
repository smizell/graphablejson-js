const axios = require('axios');
const _ = require('lodash');

exports.getShape = getShape = async function getShape({ document, query }) {
  const result = {};

  for (let property of query.properties || []) {
    result[property] = getProperty(document, property);
  }

  for (let key in query.related || {}) {
    let valueGen = getProperty(document, key);
    let relatedDoc = (await valueGen.next()).value;
    result[key] = await getShape({
      document: relatedDoc,
      query: query.related[key]
    });
  }

  return result;
}

exports.getProperty = getProperty = async function* getProperty(document, property = []) {
  if (property in document) {
    yield* handleProperty(document[property]);
  }

  else if (hasLink(document, property)) {
    yield* followDocumentLinks(document, property);
  }
}

async function* handleProperty(value) {
  if (_.isPlainObject(value)) {
    // Collections are denoted by objects that have an `$item` property.
    if (isIncludedCollection(value)) {
      for (let item of value.$item) {
        yield item;
      }

      // Follow paginated links
      if (hasLink(value, 'next')) {
        yield* followDocumentLinks(value, 'next');
      }
    }

    // Like normal properties, the `$item` for collection can be a link or an
    // array of links.
    else if (isLinkedCollection(value)) {
      for await (let item of followDocumentLinks(value, '$item')) {
        yield* handleProperty(item);
      }

      // Follow paginated links
      if (hasLink(value, 'next')) {
        yield* followDocumentLinks(value, 'next');
      }
    }

    else {
      yield value;
    }
  }

  else if (_.isArray(value)) {
    for (let item of value) {
      yield item;
    }
  }

  else {
    yield value;
  }

}

function hasLink(document, key) {
  return `${key}_url` in document || `${key}Url` in document;
}

async function* followDocumentLinks(document, property) {
  const urls = getDocumentUrls(document, property);
  for await (let url of urls) {
    let resp = await axios.get(url);
    yield* handleProperty(resp.data);
  }
}

// This uses getProperty so we can use one or many values
async function* getDocumentUrls(document, property) {
  const linkName = getLinkName(document, property);
  yield* getProperty(document, linkName);
}

function getLinkName(document, key) {
  return `${key}_url` in document ? `${key}_url` : `${key}Url`;
}

function isIncludedCollection(document) {
  return '$item' in document;
}

function isLinkedCollection(document) {
  return hasLink(document, '$item');
}
