const { ApolloServer, gql, PubSub } = require('apollo-server');

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

const POST_ADDED = 'POST_ADDED';

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
  subscriptions: {
    onConnect: (connectionParams, webSocket) => {
      if (connectionParams.authToken) {
        return validateToken(connectionParams.authToken)
          .then(findUser(connectionParams.authToken))
          .then((user) => ({
            currentUser: user,
          }));
      }

      throw new Error('Missing auth token!');
    },
  },
});

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`🚀 Server ready at ${url}`);
  console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`);
});
