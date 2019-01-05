const { expect } = require('chai');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { queries } = require('..');


// Convert an async generator into an array
async function allItems(gen) {
  let items = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items
}

describe('Raw Path', function () {
  context('plain values', function () {
    it('returns the single value', async function () {
      const result = await queries.rawPath({
        document: 42,
        query: []
      });
      expect(await allItems(result)).to.eql([42]);
    });

    it('returns all values of the array', async function () {
      const result = await queries.rawPath({
        document: [1, 2, 3],
        query: []
      });
      expect(await allItems(result)).to.eql([1, 2, 3]);
    });
  });

  context('recursive values', function () {
    it('returns direct values', async function () {
      const result = await queries.rawPath({
        document: { foo: 'bar' },
        query: ['foo']
      });
      expect(await allItems(result)).to.eql(['bar']);
    });

    it('returns the full array', async function () {
      const result = queries.rawPath({
        document: { foo: ['bar', 'baz'] },
        query: ['foo']
      });
      expect(await allItems(result)).to.eql(['bar', 'baz']);
    });

    it('returns nested direct values', async function () {
      const result = queries.rawPath({
        document: { foo: { baz: 'bar' } },
        query: ['foo', 'baz']
      });
      expect(await allItems(result)).to.eql(['bar']);
    });

    it('returns nested first of array', async function () {
      const result = queries.rawPath({
        document: { foo: { baz: ['bar', 'fuzz', 'fizz'] } },
        query: ['foo', 'baz']
      });
      expect(await allItems(result)).to.eql(['bar', 'fuzz', 'fizz']);
    });

    it('returns property of item in array', async function () {
      const result = queries.rawPath({
        document: { foo: [{ baz: 'bar' }, { baz: 'fuzz' }] },
        query: ['foo', 'baz']
      });
      expect(await allItems(result)).to.eql(['bar', 'fuzz']);
    });

    it('flattens deeply nested values', async function () {
      const result = queries.rawPath({
        document: {
          foo: [
            { baz: ['bar', 'biz'] },
            { baz: ['fizz', 'buzz'] },
          ]
        },
        query: ['foo', 'baz']
      });
      expect(await allItems(result)).to.eql(['bar', 'biz', 'fizz', 'buzz'])
    });

    it('handles arrays as inputs', async function () {
      const result = queries.rawPath({
        document: [{ baz: 'bar' }],
        query: ['baz']
      });
      expect(await allItems(result)).to.eql(['bar']);
    });
  });

  context('following links', function () {
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

    context('linking documents', function () {
      it('follows links with snake case', async function () {
        mock.onGet('/foo').reply(200, {
          bar: 'baz'
        });

        const result = await queries.rawPath({
          document: { foo_url: '/foo' },
          query: ['foo', 'bar']
        });

        expect(await allItems(result)).to.eql(['baz']);
      });

      it('follows links with camel case', async function () {
        mock.onGet('/foo').reply(200, {
          bar: 'baz'
        });

        const result = await queries.rawPath({
          document: { fooUrl: '/foo' },
          query: ['foo', 'bar']
        });

        expect(await allItems(result)).to.eql(['baz']);

        mock.reset();
      });

      it('follows multiple links', async function () {
        mock.onGet('/foo/1').reply(200, {
          bar: 'baz'
        });

        mock.onGet('/foo/2').reply(200, {
          bar: 'biz'
        });

        const result = await queries.rawPath({
          document: { foo_url: ['/foo/1', '/foo/2'] },
          query: ['foo', 'bar']
        });

        expect(await allItems(result)).to.eql(['baz', 'biz']);
      });
    });

    context('collection resources', function () {
      it('handles included items', async function () {
        mock.onGet('/customers?page=1').reply(200, {
          next_url: '/customers?page=2',
          $item: [
            {
              email: 'jdoe@example.com'
            },
            {
              email: 'rdavis@example.com'
            }
          ]
        });

        mock.onGet('/customers?page=2').reply(200, {
          $item: [
            {
              email: 'fsmith@example.com'
            },
            {
              email: 'sjohnson@example.com'
            }
          ]
        });

        const result = await queries.rawPath({
          document: { customer_url: '/customers?page=1' },
          query: ['customer', 'email']
        });

        expect(await allItems(result)).to.eql([
          'jdoe@example.com',
          'rdavis@example.com',
          'fsmith@example.com',
          'sjohnson@example.com',
        ]);
      });

      it('handles linked items', async function () {
        mock.onGet('/customers?page=1').reply(200, {
          next_url: '/customers?page=2',
          $item_url: [
            '/customers/1',
            '/customers/2'
          ]
        });

        mock.onGet('/customers?page=2').reply(200, {
          $item_url: [
            '/customers/3',
            '/customers/4'
          ]
        });

        mock.onGet('/customers/1').reply(200, {
          email: 'jdoe@example.com'
        });

        mock.onGet('/customers/2').reply(200, {
          email: 'rdavis@example.com'
        });

        mock.onGet('/customers/3').reply(200, {
          email: 'fsmith@example.com'
        });

        mock.onGet('/customers/4').reply(200, {
          email: 'sjohnson@example.com'
        });

        // This follows the customer link, follows all $item_url links, then follows
        // the next links until it's finished.
        const result = await queries.rawPath({
          document: { customer_url: '/customers?page=1' },
          query: ['customer', 'email']
        });

        expect(await allItems(result)).to.eql([
          'jdoe@example.com',
          'rdavis@example.com',
          'fsmith@example.com',
          'sjohnson@example.com',
        ]);
      });
    });
  });
});
