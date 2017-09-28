const db = require('../db')

const {Router} = require('express')
const router = module.exports = new Router()

const {sendView} = require('../middleware')

router.get('/', (req, res, next) => {
  if (req.user) return res.redirect('/game')
  next()
}, sendView)

router.post('/', (req, res, next) => {
  const {email} = req.body

  const user = db.get(`/users/${email}`)
  if (user == null) return sendView(req, res, next)

  req.session.email = user.email
  res.redirect('/game')
})

router.get('/logout', (req, res, next) => {
  delete req.session.email
  res.redirect('/login')
})
