import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache, split } from '@apollo/client';
import React from 'react';
import App from './App';
import { setContext } from '@apollo/client/link/context';
import {createRoot} from 'react-dom/client'

import { getMainDefinition } from '@apollo/client/utilities';
import { WebSocketLink } from '@apollo/client/link/ws';
import { mergeArrayByField } from './utils/merge';

const HTTPS_URI = process.env.REACT_APP_HTTPS_URI
const WS_URI = process.env.REACT_APP_WS_URI

console.log(HTTPS_URI)
console.log(WS_URI)

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('SideQuest_HQ_Login_Info');
  return {
    headers: {
      ...headers,
      authorization: token ? `bearer ${token}` : null,
      origin: document.location.origin
    },
  };
});

const httpLink = new HttpLink({
  uri: HTTPS_URI,
});

const wsLink = new WebSocketLink({
  uri: WS_URI,
  options: {
    reconnect: true,
  },
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink)
);

// define Apollo Client cache and link
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Query:{
        fields:{
          allRootTasks:{
            merge: mergeArrayByField('id')
          },
          allTags: {
            merge(existing = [], incoming) {
              return [...incoming];
            }
          }
        }
      },
      Task: {
        merge: true,
        fields:{
          subtasks:{
            merge: mergeArrayByField('id')
          },
          schedule:{
            merge:true
          }
        }
      },
      Tag: {
        merge: true
      },
    }
  }),
  link: splitLink,
});

// temporary fix for websocket link prematurely closing
wsLink.subscriptionClient.maxConnectTimeGenerator.duration = () =>
  wsLink.subscriptionClient.maxConnectTimeGenerator.max;

const root = createRoot(document.getElementById('root'));
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
);

