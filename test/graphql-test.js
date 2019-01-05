const { expect } = require('chai');
const { graphQlToShape } = require('..');
const gql = require('graphql-tag');

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
      const shape = graphQlToShape(query);
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
});
