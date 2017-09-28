// LMDB session store.
const lmdb = require('node-lmdb')

const cb = (callback, ...args) => process.nextTick(() => callback.apply(null, args))

const eachPrefix = (env, db, prefix, fn) => {
  const txn = env.beginTxn({readOnly:true})
  const cursor = new lmdb.Cursor(txn, db)
  for (let key = cursor.goToRange(prefix); key != null && key.startsWith(prefix); key = cursor.goToNext()) {
    const val = cursor.getCurrentString()
    fn(JSON.parse(val))
  }
  txn.commit()
}

module.exports = (session) => {
  class LMDBSession extends session.Store {
    constructor(env, dbi) {
      super()
      this.env = env
      this.dbi = dbi
    }

    key(sid) { return `/session/${sid}` }

    get(sid, callback) {
      const txn = this.env.beginTxn({readOnly:true})
      const data = txn.getString(this.dbi, this.key(sid))
      txn.commit()
      cb(callback, null, data == null ? null : JSON.parse(data))
    }

    set(sid, session, callback) {
      const txn = this.env.beginTxn()
      txn.putString(this.dbi, this.key(sid), JSON.stringify(session))
      txn.commit()

      cb(callback, null)
    }
    // destroy.

    length(callback) {
      let count = 0
      eachPrefix(this.env, this.dbi, this.key(''), (session) => {
        count++
      })
      return count
    }

    // NYI.
    // touch(sid, session, callback) { cb(callback) }
  }
  return LMDBSession
}
