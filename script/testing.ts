import 'dotenv/config'
import pg from 'pg'
const { Client } = pg
const envVar = process.env[`DATABASE_URL_${process.env.NODE_ENV?.toUpperCase()}`]
console.log('NODE_ENV', process.env.NODE_ENV)

const client = new Client(envVar)

const env = process.env.NODE_ENV
if (env !== 'staging' && env !== 'development' && env !== 'test') {
    throw new Error('Bad environment')
}

const machineName = 'abc123machinename'
const seq = 8
const sql = `
    SELECT check_seq('${machineName}', ${seq}) AS is_ok;
`

await client.connect()
const res = await client.query(sql)
console.log('**response**', JSON.stringify(res.rows[0], null, 2))

client.end()
