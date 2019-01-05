const { expect } = require('chai');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { getProperty } = require('..');
const { utils } = require('..');

describe('Get Property', function () {
  it('returns direct values', async function () {
    const result = await getProperty({ foo: 'bar' }, 'foo');
    expect(await utils.expandValues(result)).to.eql(['bar']);
  });

  it('returns the full array', async function () {
    const result = getProperty({ foo: ['bar', 'baz'] }, 'foo');
    expect(await utils.expandValues(result)).to.eql(['bar', 'baz']);
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
        mock.onGet('/foo').reply(200, 'baz');
        const result = await getProperty({ foo_url: '/foo' }, 'foo');
        expect(await utils.expandValues(result)).to.eql(['baz']);
      });

      it('follows links with camel case', async function () {
        mock.onGet('/foo').reply(200, 'baz');
        const result = await getProperty({ fooUrl: '/foo' }, 'foo');
        expect(await utils.expandValues(result)).to.eql(['baz']);
      });

      it('follows multiple links', async function () {
        mock.onGet('/foo/1').reply(200, 'baz');
        mock.onGet('/foo/2').reply(200, 'biz');
        const result = await getProperty({ foo_url: ['/foo/1', '/foo/2'] }, 'foo');
        expect(await utils.expandValues(result)).to.eql(['baz', 'biz']);
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

        const customers = getProperty({ customer_url: '/customers?page=1' }, 'customer');
        const emails = (await utils.expandValues(customers)).map(customer => customer.email);

        expect(emails).to.eql([
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

        const customers = getProperty({ customer_url: '/customers?page=1' }, 'customer');
        const emails = (await utils.expandValues(customers)).map(customer => customer.email);

        expect(emails).to.eql([
          'jdoe@example.com',
          'rdavis@example.com',
          'fsmith@example.com',
          'sjohnson@example.com',
        ]);
      });
    });
  });
});
