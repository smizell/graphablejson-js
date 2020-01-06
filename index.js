
const axios = require('axios');
const _ = require('lodash');

exports.utils = utils = require('./utils');

exports.rawQuery = rawQuery = function rawQuery(document, query) {
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
    yield rawQuery(item, query);
  }
}

exports.getProperty = getProperty = async function* getProperty(document, property, version) {
  if (version && hasVersion(document, property, version)) {
    const newProperty = getVersionProperty(document, property, version);
    yield* handleProperty(document[newProperty]);
  }
  else if (property in document) {
    yield* handleProperty(document[property]);
  }
  else if (hasLink(document, property)) {
    yield* followDocumentLinks(document, property);
  }
}

async function* handleProperty(value) {
  if (_.isPlainObject(value)) {
    if (await isIncludedCollection(value)) {
      for (let item of value.item) {
        yield item;
      }
      if (hasLink(value, 'next')) {
        yield* followDocumentLinks(value, 'next');
      }
    }
    else if (isLinkedCollection(value)) {
      for await (let item of followDocumentLinks(value, 'item')) {
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

function hasVersion(document, property, version) {
  return `${property}${version}` in document || `${property}_${version}` in document;
}

function getVersionProperty(document, property, version) {
  if (`${property}${version}` in document) {
    return `${property}${version}`;
  }
  else {
    return `${property}_${version}`;
  }
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

async function isIncludedCollection(document) {
  if (hasLink(document, 'profile')) {
    let profileUrls = await utils.expandValues(getDocumentUrls(document, 'profile'));
    if (profileUrls.includes("https://github.com/smizell/graphablejson/wiki/Collection") && _.has(document, "item")) {
      return true;
    }
  }
  return false;
}

function isLinkedCollection(document) {
  return hasLink(document, 'item');
}

exports.transformGql = transformGql = function (query) {
  let result;
  // Only dealing with one definition at the moment
  (query.definitions || []).forEach(function (definition) {
    result = handleSelections(definition.selectionSet.selections);
  });
  return result;
}

function handleSelections(selections) {
  let result = { properties: [], related: {} };
  (selections || []).forEach(function (selection) {
    if (selection.selectionSet) {
      result.related[selection.name.value] = handleSelections(selection.selectionSet.selections);
    }
    else {
      result.properties.push(selection.name.value);
    }
  });
  return result;
}

exports.gqlQueryDocument = gqlQueryDocument = function gqlQueryDocument(document, query) {
  return rawQuery(document, transformGql(query))
}

exports.gqlQuery = gqlQuery = async function gqlQuery(apiUrl, query) {
  let resp = await axios.get(apiUrl);
  return rawQuery(resp.data, transformGql(query));
}
