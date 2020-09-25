const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

const {
  ApolloServer, gql, PubSub, withFilter,
} = require('apollo-server-koa');

const PORT = 3000;
const POST_ADDED = 'postAdded';

const router = require('./routes');

const pubsub = new PubSub();

const typeDefs = gql`
  type Subscription {
    ${POST_ADDED}: Post!
  }

  type Query {
    posts: [Post!]
  }

  type Mutation {
    addPost(author: String!, comment: String): Post!
  }

  type Post {
    author: String!
    comment: String!
  }
`;

const posts = [
  {
    author: 'foo',
    comment: 'foo-comment',
  },
  {
    author: 'bar',
    comment: 'bar-comment',
  },
];

const resolvers = {
  Subscription: {
    [POST_ADDED]: {
      subscribe: () => {
        console.log('postAdded - subscribe');
        return pubsub.asyncIterator(POST_ADDED);
      },
      // subscribe: withFilter(
      //   () => pubsub.asyncIterator(POST_ADDED),
      //   // (payload, variables) => payload.commentAdded.repository_name === variables.repoFullName,
      // ),
    },
  },
  Query: {
    posts(root, args, context) {
      return posts;
    },
  },
  Mutation: {
    addPost(root, { author, comment }, context) {
      const newPost = { author, comment };

      posts.push(newPost);
      pubsub.publish(POST_ADDED, { [POST_ADDED]: newPost });

      return newPost;
    },
  },
};

const app = new Koa();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ ctx }) => {
    console.log('===========context==========');
    console.log(ctx);
    console.log('============================');
    return {};
  },
  subscriptions: {
    onConnect: (connectionParams, webSocket, context) => {
      console.log('==========onConnect=============');
      console.log(connectionParams);
      console.log(webSocket);
      console.log(context);
      console.log('================================');
    },
  },
  playground: {
    subscriptionEndpoint: 'subscriptions',
  },
});
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
