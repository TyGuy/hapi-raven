require('dotenv').config({ silent: true })

const Raven = require('raven')
const git = require('git-rev-sync')

const userContext = (request) => {
  const creds = request.auth.credentials
  if (!creds) { return {} }

  return {
    id: creds.id,
    name: creds.name,
    email: creds.email,
  }
}

const requestContext = (server, request) => {
  const baseUrl = request.info.uri
  || (request.info.host && `${server.info.protocol}://${request.info.host}`)
  || server.info.uri

  const url = baseUrl + request.path

  return {
    request: {
      method: request.method,
      headers: request.headers,
      host: request.info.host,
      url: url,
      query_string: request.query,
      cookies: request.state,
      body: request.payload,
      ip: request.info.remoteAddress,
    },
    extra: {
      timestamp: request.info.received,
      id: request.id,
      correlationId: request.correlationId,
      remoteAddress: request.info.remoteAddress
    },
  }
}

const sourceVersion = () => {
  try {
    return git.long()
  } catch (e) {
    return process.env.COMMIT_HASH || ''
  }
}

const getEnv = () => {
  return process.env.DEPLOYMENT_ENV || process.env.NODE_ENV || 'development'
}

const defaults = {
  release: sourceVersion(),
  environment: getEnv(),
  autoBreadcrumbs: true,
  captureUnhandledRejections: true,
}

const configure = (options) => {
  let { dsn, config } = options
  config = Object.assign({}, defaults, (config || {}))

  if (getEnv() === 'test') {
    Raven.config(dsn, config)
  } else {
    Raven.config(dsn, config).install()
  }
}

module.exports = {
  Raven: Raven,
  initRaven: (options) => configure(options),

  pkg: require('./package.json'),

  register: (server, options) => {
    configure(options)

    server.expose('client', Raven)

    server.ext({
      type: 'onPostAuth',
      method: (request, h) => {
        Raven.setContext({ user: userContext(request) })

        return h.continue
      }
    })

    server.events.on({ name: 'request', channels: 'error' }, (request, event) => {
      Raven.captureException(event.error, requestContext(server, request))
    })
  }
}
