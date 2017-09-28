const lmdb = require('node-lmdb')
const fs = require('fs')
const hat = require('hat')
const assert = require('assert')

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

const get = exports.get = (key, txn = null) => {
  const shouldClose = txn == null ? (txn = env.beginTxn({readOnly:true}), true) : false
  const data = txn.getString(db, key)
  if (shouldClose) txn.commit()
  return data != null ? JSON.parse(data) : data
}

const put = exports.put = (key, val, txn = null) => {
  const shouldClose = txn == null ? (txn = env.beginTxn(), true) : false
  txn.putString(db, key, JSON.stringify(val))
  if (shouldClose) txn.commit()
}

const del = (key) => {
  const txn = env.beginTxn()
  // The error handling is gross.
  if (txn.getBinary(db, key)) txn.del(db, key)
  txn.commit()
}

const getGame = exports.getGame = (gameId, txn) => get(`/games/${gameId}`, txn)
const saveGame = (game, txn) => put(`/games/${game.id}`, game, txn)

const {type} = require('ot-json1')
const gameListeners = new Map()
const updateGame = exports.updateGame = (game, op, txn) => {
  game = type.apply(game, op)
  game._v++
  saveGame(game, txn)
  // console.log('game is now', game)

  const listeners = gameListeners.get(game.id)
  if (listeners) listeners.forEach(l => {
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


// Timers

const putTimer = (txn, timer, prevState) => {
  // State should be 'pending', 'complete' or 'errored'.
  assert(timer.type)
  assert(timer.runAt)
  if (!timer.state) timer.state = 'pending'
  if (!timer.id) timer.id = `${timer.runAt}-${hat(16)}`

  if (prevState) txn.del(db, `/timers/${prevState}/${timer.id}`)
  txn.putString(db, `/timers/${timer.state}/${timer.id}`, JSON.stringify(timer))
}

const saveTimer = (timer) => {
  const txn = env.beginTxn()
  putTimer(txn, timer)
  txn.commit()
}

const addWork = (gameId, work) => {
  assert(work.title)
  assert(work.runAt)
  if (!work.state) work.state = 'pending'
  if (!work.startedAt) work.startedAt = Date.now()

  // I'm going to reuse the timer id as the workitem id, because I'm lazy.
  const timer = {
    type: 'workitem',
    runAt: work.runAt,
    gameId: gameId,
  }
  const txn = env.beginTxn()
  putTimer(txn, timer)
  const game = getGame(gameId, txn)
  updateGame(game, ['work', timer.id, {i:work}], txn)
  txn.commit()
}

const runTimer = (txn, timer) => {
  console.log('timer fired', timer.type, timer.id)
  switch (timer.type) {
    case 'workitem': {
      const game = getGame(timer.gameId)
      if (game.work[timer.id] == null) {
        // This shouldn't happen normally, but its really annoying so discard it when it happens.
        console.error('Work item no longer exists in game')
        break
      }
      // console.log('completing work item', game.work[timer.id])
      updateGame(game, ['work', timer.id, 'state', {r:true, i:'complete'}], txn)
      break
    }
    default: {
      throw Error('Unknown timer type ' + timer.type)
    }
  }
}

const eachPrefix = exports.eachPrefix = (prefix, fn) => {
  const txn = env.beginTxn({readOnly:true})
  const cursor = new lmdb.Cursor(txn, db)
  for (let key = cursor.goToRange(prefix); key != null && key.startsWith(prefix); key = cursor.goToNext()) {
    const val = cursor.getCurrentString()
    fn(JSON.parse(val))
  }
  txn.commit()
}

const tryRunTimer = timer => {
  const txn = env.beginTxn()
  const prevState = timer.state
  try {
    runTimer(txn, timer)
    timer.state = 'complete'
  } catch (e) {
    console.error('ERROR: Timer failed:', e)
    timer.state = 'errored'
    timer.error = e.stack
  }
  putTimer(txn, timer, prevState)
  txn.commit()
}


{
  const game = {
    id: hat(),
    work: {},
    _v: 0,
  }

  saveGame(game)

  addWork(game.id, {title:'eat bacon', runAt: Date.now() + Math.random() * 20000})
  addWork(game.id, {title:'go swimming', runAt: Date.now() + Math.random() * 20000})
  addWork(game.id, {title:'do taxes', runAt: Date.now() + Math.random() * 20000})
  addWork(game.id, {title:'icecream', runAt: Date.now() + Math.random() * 20000})
  // console.log('game', getGame(game.id))

  const users = [{
    name: 'Seph',
    email: 'me@josephg.com',
    admin: true,
    state: 'rad',
    currentGame: game.id
  }]

  users.forEach(saveUser)
}


{
  // When the server starts, retry all the errored timers
  eachPrefix('/timers/errored/', timer => {
    tryRunTimer(timer)
  })

  eachPrefix('/timers/pending/', timer => {
    if (timer.state === 'complete') return

    setTimeout(() => {
      tryRunTimer(timer)
    }, timer.runAt - Date.now())
  })
}