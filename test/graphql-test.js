const { expect } = require('chai');
const gql = require('graphql-tag');
const { transformGql, gqlQuery, utils } = require('..');

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

  context('get', function () {
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

      const result = gqlQuery(document, query);
      expect(await utils.expandObject(result)).to.eql(expectedResult);
    });
  })
});
