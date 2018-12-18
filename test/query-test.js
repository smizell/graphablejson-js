const { expect } = require('chai');
const { queries } = require('..');

describe('Query', function () {
  describe('raw', function () {
    context('value', function () {
      it('returns direct values', function () {
        const result = queries.raw({
          document: { foo: 'bar' },
          query: ['foo'],
          select: 'value'
        });
        expect(result).to.equal('bar');
      });

      it('returns the first of arrays', function () {
        const result = queries.raw({
          document: { foo: ['bar', 'baz'] },
          query: ['foo'],
          select: 'value'
        });
        expect(result).to.equal('bar');
      });

      it('returns nested direct values', function () {
        const result = queries.raw({
          document: { foo: { baz: 'bar' } },
          query: ['foo', 'baz'],
          select: 'value'
        });
        expect(result).to.equal('bar');
      });

      it('returns nested first of array', function () {
        const result = queries.raw({
          document: { foo: { baz: ['bar', 'fuzz'] } },
          query: ['foo', 'baz'],
          select: 'value'
        });
        expect(result).to.equal('bar');
      });

      it('returns property of item in array', function () {
        const result = queries.raw({
          document: { foo: [{ baz: 'bar' }] },
          query: ['foo', 'baz'],
          select: 'value'
        });
        expect(result).to.equal('bar');
      });

      it('returns first item in property of item in array', function () {
        const result = queries.raw({
          document: { foo: [{ baz: 'bar' }, { baz: 'fuzz' }] },
          query: ['foo', 'baz'],
          select: 'value'
        });
        expect(result).to.equal('bar');
      });
    });

    context('values', function () {
      it('returns direct values', function () {
        const result = queries.raw({
          document: { foo: 'bar' },
          query: ['foo'],
          select: 'values'
        });
        expect(result).to.eql(['bar']);
      });

      it('returns the full array', function () {
        const result = queries.raw({
          document: { foo: ['bar', 'baz'] },
          query: ['foo'],
          select: 'values'
        });
        expect(result).to.eql(['bar', 'baz']);
      });

      it('returns nested direct values', function () {
        const result = queries.raw({
          document: { foo: { baz: 'bar' } },
          query: ['foo', 'baz'],
          select: 'values'
        });
        expect(result).to.eql(['bar']);
      });

      it('returns nested first of array', function () {
        const result = queries.raw({
          document: { foo: { baz: ['bar', 'fuzz', 'fizz'] } },
          query: ['foo', 'baz'],
          select: 'values'
        });
        expect(result).to.eql(['bar', 'fuzz', 'fizz']);
      });

      it('returns property of item in array', function () {
        const result = queries.raw({
          document: { foo: [{ baz: 'bar' }, { baz: 'fuzz' }] },
          query: ['foo', 'baz'],
          select: 'values'
        });
        expect(result).to.eql(['bar', 'fuzz']);
      });

      it('flattens deeply nested values', function () {
        const results = queries.raw({
          document: {
            foo: [
              { baz: ['bar', 'biz'] },
              { baz: ['fizz', 'buzz'] },
            ]
          },
          query: ['foo', 'baz'],
          select: 'values'
        });
        expect(results).to.eql(['bar', 'biz', 'fizz', 'buzz'])
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
          select: 'value',
          latest: true
        });
        expect(result1).to.equal(true);

        const result2 = queries.raw({
          document: {
            foo: {
              bar: true,
            },
            // Code should not follow latest until the last property This
            // ensures that our code doesn't get greedy and follow the first
            // latest.
            foo__latest: {
              bar: 1
            }
          },
          query: ['foo', 'bar'],
          select: 'value',
          latest: true
        });
        expect(result2).to.equal(true);
      });
    });
  });
});
