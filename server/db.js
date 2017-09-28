const lmdb = require('node-lmdb')
const fs = require('fs')
const rack = require('hat').rack(64)

const env = exports.env = new lmdb.Env()

const location = 'db'

// Check that the directory exists.
try { fs.mkdirSync(location) }
catch(e) { if (e.code !== 'EEXIST') throw e }
env.open({
  path: location,
  noTls: true
})
const db = exports.db = env.openDbi({name: 'data', create: true})

// const inTxn = (ro, fn) => {
//   const txn = env.beginTxn(ro ? {readOnly:true} : null)
//   const ret = fn(txn)
//   txn.commit()
//   return ret
// }

const get = exports.get = (key) => {
  const txn = env.beginTxn({readOnly:true})
  const data = txn.getString(db, key)
  txn.commit()
  return data != null ? JSON.parse(data) : data
}

const put = exports.put = (key, val) => {
  const txn = env.beginTxn()
  const data = txn.putString(db, key, JSON.stringify(val))
  txn.commit()
}

const del = (key) => {
  const txn = env.beginTxn()
  // The error handling is gross.
  if (txn.getBinary(db, key)) txn.del(db, key)
  txn.commit()
}

exports.getGame = id => get(`/games/${id}`)
const saveGame = game => put(`/games/${game.id}`, game)

const {type} = require('ot-json1')
const gameListeners = new Map()
const updateGame = exports.updateGame = (game, op) => {
  game = type.apply(game, op)
  game._v++
  saveGame(game)
  console.log('game is now', game)

  const listeners = gameListeners.get(game.id)
  if (listeners) listeners.forEach(l => {
    console.log('l')
    l(game, op)
  })
}
exports.addGameListener = (id, listener) => {
  console.log('add game listener', id)
  let l = gameListeners.get(id)
  if (!l) {
    l = new Set
    gameListeners.set(id, l)
  }
  l.add(listener)
}
exports.removeGameListener = (id, listener) => {
  const l = gameListeners.get(id)
  if (l) l.delete(listener)
}

const saveUser = exports.saveUser = user => {
  put(`/users/${user.email}`, user)
}


{
  const game = {
    id: 'thegameid',
    work: [
      {label: 'work work', completeAt: Date.now() + 5000, complete: false}
    ],
    _v: 0,
  }

  saveGame(game)

  const users = [{
    name: 'Seph',
    email: 'me@josephg.com',
    admin: true,
    state: 'rad',
    currentGame: 'thegameid'
  }]

  users.forEach(saveUser)
}

// Load all the games and make timers for work
const eachGame = fn => {
  const txn = env.beginTxn({readOnly:true})
  const cursor = new lmdb.Cursor(txn, db)
  for (let key = cursor.goToRange('/games/'); key != null && key.startsWith('/games/'); key = cursor.goToNext()) {
    const val = cursor.getCurrentString()
    const game = JSON.parse(val)
    fn(game)
  }
}

eachGame(game => {
  game.work.forEach((wu, i) => {
    setTimeout(() => {
      console.log('game', game)
      updateGame(game, ['work', i, 'complete', {r:1, i:true}])
    }, wu.completeAt - Date.now())
  })
})