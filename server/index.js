const express = require('express')
const app = express()
const db = require('./db')



const {
  buildSchema,
  graphql
} = require('graphql')


const schema = buildSchema(`
  type User {
    name: String!
    email: String!
    admin: Boolean!
    state: String!
    game: Game
  }

  type Game {
    id: String!
  }

  type Query {
    hello: String!
    user(email: String!): User
    me: User
  }
`)


const addUserFields = user => {
  if (user == null) return null

  user.game = () => user.currentGame && db.get(`/games/${user.currentGame}`)
  return user
}

const gqlRoot = {
  hello() { return 'yooo' },
  user({email}) {
    return addUserFields(db.get(`/users/${email}`))
  },
  me(_, req) { return addUserFields(req.user) },
}




app.use(express.static(`${__dirname}/../public`))

const IS_PROD = process.env['NODE_ENV'] === 'production'
const sessionStore = require('express-session')
app.use(sessionStore({
  store: new (require('./sessionstore')(sessionStore))(db.env, db.db),
  resave: false,
  secret: '4aUExKMPjdFWi4D8',
  saveUninitialized: true,
  cookie: { secure: IS_PROD }
}))

app.use((req, res, next) => {
  // console.log(req.session)
  if (req.session && req.session.email) req.user = db.get(`/users/${req.session.email}`)
  res.locals.state = {user: req.user}
  next()
})

app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({extended: true}))

app.use('/login', require('./routes/login'))
app.use('/game', require('./routes/game'))

app.use('/graphql', (req, res, next) => {
  // console.log(req.session)
  if (!req.user) return res.redirect('/login')
  if (!req.user.admin) return res.sendStatus(403)
  else next()
}, require('express-graphql')({
  rootValue: gqlRoot,
  schema,
  graphiql: true
}))

const server = require('http').createServer(app)
const WebSocket = require('ws')
const wss = new WebSocket.Server({ server })
const url = require('url')
wss.on('connection', (ws, req) => {
  const loc = url.parse(req.url, true)
  const {id} = loc.query
  if (loc.pathname !== '/game' || !id) {
    console.log('loc', loc, id)
    return ws.close()
  }

  // TODO: AUTHENTICATE! HAHAHAHA

  {
    const game = db.getGame(id)
    ws.send(JSON.stringify(game))
  }

  ws.on('message', msg => {

  })

  const listener = (game, op) => {
    ws.send(JSON.stringify(op))
  }
  db.addGameListener(id, listener)

  ws.on('close', () => db.removeGameListener(id, listener))
})

server.listen(2345)
console.log('listening on 2345')
