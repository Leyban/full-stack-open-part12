// apollo express server
const { ApolloServer } = require('apollo-server-express')
const { makeExecutableSchema } = require('@graphql-tools/schema')

// express server
const express = require('express')
const http = require('http')

// for subscription purposes 
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const { execute, subscribe } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws');

// Mongo DB imports
const mongoose = require('mongoose')

// graphql components
const typeDefs = require('./schema')
const resolvers = require('./resolver')


// config variables
require('dotenv').config()
const MONGODB_URI = process.env.MONGODB_URI
const SECRET = process.env.SECRET

// token authorization
const User = require('./models/user.js')
const jwt = require('jsonwebtoken')


// connect to database
console.log('connecting to ', MONGODB_URI)
mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('connected to MongoDB'))
    .catch(error => console.log('unable to connect to mongoDB', error))


// server declaration 
const start = async () => {
    const app = express()
    const httpServer = http.createServer(app)

    const schema = makeExecutableSchema({ typeDefs, resolvers})

    // subscription server declaration
    const subscriptionServer = SubscriptionServer.create(
        {
          schema,
          execute,
          subscribe,
        },
        {
          server: httpServer,
          path: '',
        }
      );

    // creating an apollo server that extracts header token
    const server = new ApolloServer({
        schema,

        // extracting token from request
        context: async ({ req }) => {
            const auth = req ? req.headers.authorization : null;
            if (auth && auth.toLowerCase().startsWith('bearer ')) {
              const decodedToken = jwt.verify(auth.substring(7), SECRET);
              const currentUser = await User.findById(decodedToken.id);
              return { currentUser };
            }
        },

        // CORS Policy
        cors:{
          origin: ['https://leyban.github.io/', "https://studio.apollographql.com", 'http://localhost:3000/']
        },

        // Plugin for http server with subscription feature
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
              async serverWillStart() {
                return {
                  async drainServer() {
                    subscriptionServer.close();
                  },
                };
              },
            },
          ],
    })

    await server.start()

    server.applyMiddleware({
        app,
        path: '/',
    });


    const PORT = process.env.PORT || 4000

    httpServer.listen(PORT, () => console.log(`Server is now running on http://localhost:${PORT}`))
}

start()
