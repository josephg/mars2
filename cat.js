const lmdb = require('node-lmdb')

const env = new lmdb.Env()

env.open({
  path: 'db',
  noTls: true
})
const db = env.openDbi({name: 'data', create: false})

const txn = env.beginTxn({readOnly:true})
const cursor = new lmdb.Cursor(txn, db)

for (let key = cursor.goToFirst(); key !== null; key = cursor.goToNext()) {
  const val = cursor.getCurrentString()
  console.log(`${key}\t-\t${val}`)
}

txn.commit()
