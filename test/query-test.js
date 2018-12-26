const { expect } = require('chai');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { queries } = require('..');

const mock = new MockAdapter(axios);

// Convert an async generator into an array
async function allItems(gen) {
  let items = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items
}

describe('Query', function () {
  describe('raw', function () {
    context('recursive values', function () {
      it('returns direct values', async function () {
        const result = await queries.raw({
          document: { foo: 'bar' },
          query: ['foo']
        });
        expect(await allItems(result)).to.eql(['bar']);
      });

      it('returns the full array', async function () {
        const result = queries.raw({
          document: { foo: ['bar', 'baz'] },
          query: ['foo']
        });
        expect(await allItems(result)).to.eql(['bar', 'baz']);
      });

      it('returns nested direct values', async function () {
        const result = queries.raw({
          document: { foo: { baz: 'bar' } },
          query: ['foo', 'baz']
        });
        expect(await allItems(result)).to.eql(['bar']);
      });

      it('returns nested first of array', async function () {
        const result = queries.raw({
          document: { foo: { baz: ['bar', 'fuzz', 'fizz'] } },
          query: ['foo', 'baz']
        });
        expect(await allItems(result)).to.eql(['bar', 'fuzz', 'fizz']);
      });

      it('returns property of item in array', async function () {
        const result = queries.raw({
          document: { foo: [{ baz: 'bar' }, { baz: 'fuzz' }] },
          query: ['foo', 'baz']
        });
        expect(await allItems(result)).to.eql(['bar', 'fuzz']);
      });

      it('flattens deeply nested values', async function () {
        const result = queries.raw({
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
        const result = queries.raw({
          document: [{ baz: 'bar' }],
          query: ['baz']
        });
        expect(await allItems(result)).to.eql(['bar']);
      });
    });

    context('linking documents', function () {
      it('follows links with snake case', async function () {
        mock.onGet('/foo').reply(200, {
          bar: 'baz'
        });

        const result = await queries.raw({
          document: { foo_url: '/foo' },
          query: ['foo', 'bar']
        });

        expect(await allItems(result)).to.eql(['baz']);

        mock.reset();
      });

      it('follows links with camel case', async function () {
        mock.onGet('/foo').reply(200, {
          bar: 'baz'
        });

        const result = await queries.raw({
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

        const result = await queries.raw({
          document: { foo_url: ['/foo/1', '/foo/2'] },
          query: ['foo', 'bar']
        });

        expect(await allItems(result)).to.eql(['baz', 'biz']);

        mock.reset();
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

        const result = await queries.raw({
          document: { customer_url: '/customers?page=1' },
          query: ['customer', 'email']
        });

        expect(await allItems(result)).to.eql([
          'jdoe@example.com',
          'rdavis@example.com',
          'fsmith@example.com',
          'sjohnson@example.com',
        ]);

        mock.reset();
      });
    });
  });
});
