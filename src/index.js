const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

const {
  ApolloServer, ApolloError, gql, PubSub,
} = require('apollo-server-koa');

const PORT = 4000;
const POST_ADDED = 'postAdded';

const router = require('./routes');

const app = new Koa();
const pubsub = new PubSub();

const typeDefs = gql`
  type Subscription {
    postAdded: Post
  }
  type Query {
    posts: [Post]
  }
  type Mutation {
    addPost(author: String, comment: String): Post
  }
  type Post {
    author: String
    comment: String
  }
`;

const posts = [];

const resolvers = {
  Subscription: {
    postAdded: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubsub.asyncIterator([POST_ADDED]),
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
      pubsub.publish(POST_ADDED, { postAdded: newPost });

      return newPost;
    },
  },
};

// ... validate token and return a Promise, rejects in case of an error
const validateToken = (authToken) => Promise.resolve(true);

// ... finds user by auth token and return a Promise, rejects in case of an error
const findUser = (authToken) => (tokenValidationResult) => new Promise((resolve, reject) => {
  if (tokenValidationResult) {
    return resolve({ userId: 1 });
  }

  return reject(new Error('NOT FOUND'));
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx, connection }) => {
    console.log('===========context==============');
    console.log(ctx);
    console.log(connection);
    console.log('================================');

    if (ctx) {
      const { request } = ctx;
      const { authtoken: authToken } = request.headers;

      if (authToken) {
        return validateToken(authToken)
          .then(findUser(authToken))
          .then((user) => {
            console.log(user);

            return {
              request,
              currentUser: user,
            };
          });
      }

      throw new ApolloError('Missing auth token!');
    } else if (connection) {
      return connection.context;
    }
  },
  subscriptions: {
    onConnect: (connectionParams, webSocket) => {
      console.log('===========onConnect============');
      console.log(connectionParams);
      console.log(webSocket);
      console.log('================================');

      if (connectionParams.authToken) {
        return validateToken(connectionParams.authToken)
          .then(findUser(connectionParams.authToken))
          .then((user) => {
            console.log(user);

            return {
              currentUser: user,
            };
          });
      }

      throw new Error('Missing auth token!');
    },
    onDisconnect: (websocket, context) => {
      console.log('===========onDisconnect=========');
      console.log(websocket);
      console.log(context);
      console.log('================================');
    },
  },
});

app
  .use(cors())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

const httpServer = app.listen({ port: PORT }, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
});

server.applyMiddleware({ app });
server.installSubscriptionHandlers(httpServer);
