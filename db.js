const knex = require('knex')

const db = {}
db.query = null

db.connect = async () => {
  try {
    db.query = await knex({
      client: 'pg',
      version: '8.8',
      connection: {
        host: "",
        port: 15432,
        user: "",
        password: "",
        database: ""
      }
    })
    console.log('Connect progress db successfully.')
  } catch (error) {
    console.log('Connect progress db error :', error.message)
  }
}

db.isConnected = async () => {
  const connected = await db.query.raw('select 1')
  return !!connected.rows[0][0]
}


module.exports = db
