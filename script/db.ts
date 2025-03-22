import { Client } from 'pg'
const envVar = process.env[`DATABASE_URL_${process.env.NODE_ENV?.toUpperCase()}`]
const client = new Client(envVar)

// sql test
const statements = [
    // Clear any existing data
    'DROP TABLE IF EXISTS messages',
    // CREATE the messages table
    'CREATE TABLE IF NOT EXISTS messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), message STRING)',
    // INSERT a row into the messages table
    "INSERT INTO messages (message) VALUES ('Hello world!')",
    // SELECT a row from the messages table
    'SELECT message FROM messages',
]

// TODO
// replace `statements` with real seed data.

const res = await Promise.all(statements.map(async sql => {
    const res = await client.query(sql)
    return (res.rows && res.rows[0])
}))

console.log('**all done**', res.filter(Boolean))
