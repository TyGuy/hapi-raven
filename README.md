hapi-raven
<!--[![Build Status](https://travis-ci.org/bendrucker/hapi-raven.svg?branch=master)](https://travis-ci.org/bendrucker/hapi-raven)-->
==========

A Hapi plugin for sending exceptions to Sentry through Raven.

**NOTE:** this is forked from [bendrucker/hapi-raven](https://github.com/bendrucker/hapi-raven), but has some breaking changes, including:
* It has additional dependencies (git-rev-parse, dotenv)
* `client` option has been changed to `config`
* `tags` should be passed as child object to `config`, not as separate option

## To Do
* change test suite:
  - use mocha/chai, or lab/code
  - stub via sinon (get rid of proxyquire please)


## Setup

Options:

* **`dsn`**: Your Sentry DSN (required)
* **`config`**: An options object that will be passed directly to the client as its second argument (optional)

Note that DSN configuration using `process.env` is not supported. If you wish to replicate the [default environment variable behavior](https://github.com/getsentry/raven-node/blob/master/lib/client.js#L21), you'll need to supply the value directly:

```js
server.register({
  plugin: require('hapi-raven'),
  options: {
    dsn: process.env.SENTRY_DSN
  }
})
```

## Usage

Once you register the plugin on a server, logging will happen automatically.

The plugin listens for [`'request-error'` events](http://hapijs.com/api#server-events) which are emitted any time `reply` is called with an error where `err.isBoom === false`. Note that the `'request-error'` event is emitted for all thrown exceptions and passed errors that are not Boom errors. Transforming an error at an extension point (e.g. `'onPostHandler'` or `'onPreResponse'`) into a Boom error will not prevent the event from being emitted on response.

--------------

#### Boom Non-500 Errors are Not Logged

```js
server.route({
  method: 'GET',
  path: '/',
  handler: function (request, reply) {
    reply(Hapi.error.notFound())
  }
})

server.inject('/', function (response) {
  // nothing was logged
})
```

#### 500 Errors are Logged

```js
server.route({
  method: 'GET',
  path: '/throw',
  handler: function (request, reply) {
    throw new Error()
  }
})

server.inject('/throw', function (response) {
  // thrown error is logged to Sentry
})
```

```js
server.route({
  method: 'GET',
  path: '/reply',
  handler: function (request, reply) {
    reply(new Error())
  }
})

server.inject('/throw', function (response) {
  // passed error is logged to Sentry
})
```

-------------------------

For convenience, hapi-raven [exposes](http://hapijs.com/api#pluginexposekey-value) the `node-raven` client on your server as `server.plugins['hapi-raven'].client`. If you want to capture errors other than those raised by `'request-error'`, you can use the client directly inside an [`'onPreResponse'`](http://hapijs.com/api#error-transformation) extension point.

### Example: Capture all 404 errors
```js
server.ext('onPreResponse', function (request, reply) {
  if (request.isBoom && request.response.statusCode === 404) {
    server.plugins['hapi-raven'].client.captureError(request.response)
  }
})
```
