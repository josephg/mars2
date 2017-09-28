const views = require('../views')
const clientApp = require('choo')()
{
  for (const url in views) clientApp.route(url, views[url])
}

exports.sendView = (req, res, next) => {
  const path = require('url').parse(req.originalUrl).pathname

  const state = Object.assign(res.locals.state, {
    session: req.session,
    // user: req.session ? req.session.user : null,
  })
  const str = clientApp.toString(path, state)
  if (str === '404') return next()

  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.end('<!doctype html>' + str)
}

exports.requireUser = (req, res, next) => {
  if (!req.user) return res.redirect('/login')

  return next()
}
