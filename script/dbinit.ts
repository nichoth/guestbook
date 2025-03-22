import 'dotenv/config'
import pg from 'pg'
const { Client } = pg
const envVar = process.env[`DATABASE_URL_${process.env.NODE_ENV?.toUpperCase()}`]
console.log('NODE_ENV', process.env.NODE_ENV)
console.log('env var...', envVar)
const client = new Client(envVar)

const env = process.env.NODE_ENV
if (env !== 'staging' && env !== 'development' && env !== 'test') {
    throw new Error('Bad environment')
}

// sql test
// const statements = [
//     // Clear any existing data
//     'DROP TABLE IF EXISTS messages',
//     // CREATE the messages table
//     'CREATE TABLE IF NOT EXISTS messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), message STRING)',
//     // INSERT a row into the messages table
//     "INSERT INTO messages (message) VALUES ('Hello world!')",
//     // SELECT a row from the messages table
//     'SELECT message FROM messages',
// ]

// the env var determines which DB we are targeting
const statements = [
    'DROP TABLE IF EXISTS usr',
    `CREATE TABLE IF NOT EXISTS usr (
        id       UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
        email    STRING NOT NULL,
        username STRING NOT NULL 
    );`,
    "INSERT INTO usr (username, email) VALUES ('abc 123', 'test@beef.com')"
]

// TODO
// replace `statements` with real seed data.

try {
    await client.connect()
    const res = await Promise.all(statements.map(sql => {
        return client.query(sql)
    }))

    console.log('success', res.filter(r => Boolean(r)).map(r => r.rows))
} catch (err) {
    console.log('**error**', err)
}

client.end()
