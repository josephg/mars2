// LMDB session store.
const lmdb = require('node-lmdb')

const cb = (callback, ...args) => process.nextTick(() => callback.apply(null, args))

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
      const txn = this.env.beginTxn({readOnly:true})
      const cursor = new lmdb.Cursor(txn, this.dbi)
      const prefix = this.key('')
      cursor.goToKey(prefix)
      let count = 0

      while (true) {
        // End of db.
        if (cursor.goToNext() == null) break

        let done = false
        cursor.getCurrentString((key, val) => {
          // End of sessions.
          if (!s.startsWith(prefix)) done = true
          else count++
        })
        if (done) break
      }

      txn.commit()
      return count
    }

    // NYI.
    // touch(sid, session, callback) { cb(callback) }
  }
  return LMDBSession
}
