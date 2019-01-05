const { expect } = require('chai');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const _ = require('lodash');
const { queries } = require('..');

// Convert an async generator into an array
async function allItems(gen) {
  let items = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items
}

async function fullObject(obj) {
  const result = {};

  for (let key in obj) {
    let value = obj[key];

    // For now assume anything that isn't an array is a generator
    if (!_.isPlainObject(value)) {
      result[key] = await allItems(value);
    }
    else {
      result[key] = await fullObject(value);
    }
  }

  return result;
}

describe('Raw Shape', function () {
  it('finds existing attributes', async function () {
    const document = {
      foo: 1,
      bar: 2
    };
    const query = {
      properties: ['foo', 'bar']
    };
    const expectedResult = {
      foo: [1],
      bar: [2]
    };
    const result = await queries.rawShape({ document, query })
    const resultObj = await fullObject(result);
    expect(resultObj).to.eql(expectedResult);
  });

  it('finds related objects', async function () {
    const document = {
      baz: 2,
      foo: {
        bar: 1
      },
    };
    const query = {
      properties: ['baz'],
      related: {
        foo: {
          properties: ['bar']
        }
      }
    };
    const expectedResult = {
      baz: [2],
      foo: {
        bar: [1]
      }
    };
    const result = await queries.rawShape({ document, query })
    const resultObj = await fullObject(result);
    expect(resultObj).to.eql(expectedResult);
  });

  context('links', function () {
    let mock;

    before(function () {
      mock = new MockAdapter(axios);
    });

    afterEach(function () {
      mock.reset();
    })

    after(function () {
      mock.restore();
    });

    it('follows links', async function () {
      mock.onGet('/foo').reply(200, {
        bar: 1
      });
      const document = {
        foo_url: '/foo'
      };
      const query = {
        related: {
          foo: {
            properties: ['bar']
          }
        }
      };
      const expectedResult = {
        foo: {
          bar: [1]
        }
      };
      const result = await queries.rawShape({ document, query })
      const resultObj = await fullObject(result);
      expect(resultObj).to.eql(expectedResult);
    });
  });
});
