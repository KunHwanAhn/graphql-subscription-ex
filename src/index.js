const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

const { ApolloServer, gql } = require('apollo-server-koa');

const PORT = 3000;

const router = require('./routes');

const typeDefs = gql`
  type Query {
    hello: String!
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello world!',
  },
};

const app = new Koa();

const server = new ApolloServer({ typeDefs, resolvers });
server.applyMiddleware({ app });

app
  .use(cors())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen({ port: PORT }, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
});
