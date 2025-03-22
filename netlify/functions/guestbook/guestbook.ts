import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { Client } from 'pg'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'

/**
 * PUT call means add or update the contact info for the given user.
 *   - Must authenticate using the machine key.
 * (PUT is idempotent)
 *
 */
export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
    if (ev.httpMethod !== 'GET' && ev.httpMethod !== 'PUT') {
        return { statusCode: 405 }
    }

    // check the auth/header
    // const headerString = ev.headers.authorization
    // if (!headerString) return { body: 'Need to authenticate', statusCode: 401 }
    // const parsedHeader:ParsedHeader = parseHeader(headerString)
    // const { seq, author } = parsedHeader

    // check signature
    // const isOk = await verifyParsed(parsedHeader)   // check signature
    // if (!isOk) {
    //     return { body: 'Invalid signature', statusCode: 403 }
    // }

    const client = new Client(process.env.DATABASE_URL)

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

    const statements = [
        'SELECT message FROM messages',
    ]

    if (ev.httpMethod === 'GET') {
        // get the guestbook
        // check the seq # in request
        await client.connect()
        let res:(undefined|Record<string, string>)[]
        try {
            // const results = await client.query('SELECT NOW()')
            res = await Promise.all(statements.map(async sql => {
                const res = await client.query(sql)
                return (res.rows && res.rows[0])
            }))
        } catch (err) {
            console.error('error executing query:', err)
            res = []
        } finally {
            client.end()
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                result: (res).filter(r => Boolean(r))
            })
        }
    }

    /**
     * method is PUT
     *   - write to the DB
     */

    // parse the incoming request
    if (!ev.body) return { statusCode: 400 }
    const data:{
        username:string;
        humanName:string;
        body:string;
        email:string;
        bluesky:string;
    } = JSON.parse(ev.body)

    const { username, body, email } = data
    if (email.length > 100 || username.length > 100) {
        return { statusCode: 413 }
    }
    if (body.length > 6000) {
        return { statusCode: 413 }
    }

    // no spaces
    const slugUsername = username.split(' ').filter(Boolean).join('_')

    if (!slugUsername) {
        return { statusCode: 401 }
    }

    // update the DB

    return {
        statusCode: 200,
        body: JSON.stringify({ hello: 'hello' })
    }
}
