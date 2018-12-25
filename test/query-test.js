const { expect } = require('chai');
const { queries } = require('..');

describe('Query', function () {
  describe('raw', function () {
    context('values', function () {
      it('returns direct values', function () {
        const result = queries.raw({
          document: { foo: 'bar' },
          query: ['foo']
        });
        expect([...result]).to.eql(['bar']);
      });

      it('returns the full array', function () {
        const result = queries.raw({
          document: { foo: ['bar', 'baz'] },
          query: ['foo']
        });
        expect([...result]).to.eql(['bar', 'baz']);
      });

      it('returns nested direct values', function () {
        const result = queries.raw({
          document: { foo: { baz: 'bar' } },
          query: ['foo', 'baz']
        });
        expect([...result]).to.eql(['bar']);
      });

      it('returns nested first of array', function () {
        const result = queries.raw({
          document: { foo: { baz: ['bar', 'fuzz', 'fizz'] } },
          query: ['foo', 'baz']
        });
        expect([...result]).to.eql(['bar', 'fuzz', 'fizz']);
      });

      it('returns property of item in array', function () {
        const result = queries.raw({
          document: { foo: [{ baz: 'bar' }, { baz: 'fuzz' }] },
          query: ['foo', 'baz']
        });
        expect([...result]).to.eql(['bar', 'fuzz']);
      });

      it('flattens deeply nested values', function () {
        const results = queries.raw({
          document: {
            foo: [
              { baz: ['bar', 'biz'] },
              { baz: ['fizz', 'buzz'] },
            ]
          },
          query: ['foo', 'baz']
        });
        expect([...results]).to.eql(['bar', 'biz', 'fizz', 'buzz'])
      });

      it('handles arrays as inputs', function () {
        const result = queries.raw({
          document: [{ baz: 'bar' }],
          query: ['baz']
        });
        expect([...result]).to.eql(['bar']);
      });
    });

    context('latest', function () {
      it('returns the latest value', function () {
        const result1 = queries.raw({
          document: {
            foo: {
              bar: 1,
              bar__latest: true
            }
          },
          query: ['foo', 'bar'],
          latest: true
        });
        expect([...result1]).to.eql([true]);

        const result2 = queries.raw({
          document: {
            foo: {
              bar: 1,
            },
            // Code should follow latest on each property
            foo__latest: {
              bar: true
            }
          },
          query: ['foo', 'bar'],
          latest: true
        });
        expect([...result2]).to.eql([true]);
      });
    });
  });
});
