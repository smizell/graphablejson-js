const { expect } = require('chai');
const gql = require('graphql-tag');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { transformGql, gqlQuery, gqlQueryDocument, utils } = require('..');

describe('GraphQL Query', function () {
  context('transform', function () {
    it('transforms to shape syntax', async function () {
      const query = gql`{
        version
        user {
          firstName
          lastName
        }
      }`;
      const shape = transformGql(query);
      expect(shape).to.eql({
        properties: ['version'],
        related: {
          user: {
            properties: ['firstName', 'lastName'],
            related: {}
          }
        }
      });
    });
  });

  context('gqlQueryDocument', function () {
    it('returns the correct shape', async function () {
      const document = {
        name: 'Jane Doe',
        email: ['jdoe@example.com'],
        order: [
          { order_number: '1000' }
        ]
      };

      const query = gql`{
        name
        email
        order {
          order_number
        }
      }`;

      const expectedResult = {
        name: ['Jane Doe'],
        email: ['jdoe@example.com'],
        order: [
          { order_number: ['1000'] }
        ]
      };

      const result = gqlQueryDocument(document, query);
      expect(await utils.expandObject(result)).to.eql(expectedResult);
    });
  });

  context('gqlQuery', function () {
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

    it('returns the correct shape', async function () {
      const document = {
        name: 'Jane Doe',
        email: ['jdoe@example.com'],
        order: [
          { order_number: '1000' }
        ]
      };

      mock.onGet('/').reply(200, document);

      const query = gql`{
        name
        email
        order {
          order_number
        }
      }`;

      const expectedResult = {
        name: ['Jane Doe'],
        email: ['jdoe@example.com'],
        order: [
          { order_number: ['1000'] }
        ]
      };

      const result = gqlQuery('/', query);
      // We have to await the results and then await the expansion of those results
      expect(await utils.expandObject(await result)).to.eql(expectedResult);
    });
  });
});
