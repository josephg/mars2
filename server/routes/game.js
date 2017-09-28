const db = require('../db')

const {Router} = require('express')
const router = module.exports = new Router()

const {sendView} = require('../middleware')


router.get('/', (req, res, next) => {
  console.log('user', req.user)
  res.locals.state.game = db.get(`/games/${req.user.currentGame}`)
  next()
}, sendView)
