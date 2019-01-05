
const axios = require('axios');
const _ = require('lodash');

exports.utils = require('./utils');

exports.getShape = getShape = async function getShape({ document, query }) {
  const result = {};
  for (let property of query.properties || []) {
    result[property] = getProperty(document, property);
  }
  for (let relatedName in query.related || {}) {
    let items = getProperty(document, relatedName);
    result[relatedName] = getRelated(items, query.related[relatedName]);
  }
  return result;
}

exports.getRelated = getRelated = async function* getRelated(items, query) {
  for await (let item of items) {
    yield await getShape({
      document: item,
      query
    });
  }
}

exports.getProperty = getProperty = async function* getProperty(document, property) {
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

exports.graphQlToShape = function (query) {
  let result = { properties: [], related: {} };
  (query.definitions).forEach(function (definition) {
    (definition.selectionSet.selections).forEach(function (selection) {
      if (selection.selectionSet) {
        result.related[selection.name.value] = handleSelectionSet(selection.selectionSet);
      }
      else {
        result.properties.push(selection.name.value);
      }
    });
  });
  return result;
}

function handleSelectionSet(selectionSet) {
  let result = { properties: [], related: {} };
  (selectionSet.selections).forEach(function (selection) {
    if (selection.selectionSet) {
      result.related[selection.name.value] = handleSelectionSet(selection.selectionSet);
    }
    else {
      result.properties.push(selection.name.value);
    }
  });
  return result;
}
