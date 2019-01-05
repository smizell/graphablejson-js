const axios = require('axios');
const _ = require('lodash');

exports.getShape = getShape = async function getShape({ document, query }) {
  const result = {};
  for (let property of query.properties || []) {
    result[property] = getProperty(document, property);
  }
  for (let relatedProperty in query.related || {}) {
    result[relatedProperty] = [];
    for await (let related of getProperty(document, relatedProperty)) {
      result[relatedProperty].push(await getShape({
        document: related,
        query: query.related[relatedProperty]
      }));
    }
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
    if (isIncludedCollection(value)) {
      for (let item of value.$item) {
        yield item;
      }
      if (hasLink(value, 'next')) {
        yield* followDocumentLinks(value, 'next');
      }
    }
    else if (isLinkedCollection(value)) {
      for await (let item of followDocumentLinks(value, '$item')) {
        yield item;
      }
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
    // Using handleProperty allows the value to be a collection
    yield* handleProperty(resp.data);
  }
}

async function* getDocumentUrls(document, property) {
  const linkName = getLinkName(document, property);
  // getProperty allows for one or more URLs
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
