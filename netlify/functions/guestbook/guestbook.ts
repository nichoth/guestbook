import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import Knex from 'knex'
import { getDeviceName } from '@bicycle-codes/keys'
import { Client } from 'pg'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { getDbString } from '../util.js'

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

    const knex = Knex({
        client: 'pg',
        connection: getDbString(process.env)
    })
    // check the auth/header
    const headerString = ev.headers.authorization
    if (!headerString) return { body: 'Need to authenticate', statusCode: 401 }
    const parsedHeader:ParsedHeader = parseHeader(headerString)
    const { seq, author } = parsedHeader

    // check signature
    const isOk = await verifyParsed(parsedHeader)   // check signature
    if (!isOk) {
        return { body: 'Invalid signature', statusCode: 403 }
    }

    const client = new Client(getDbString(process.env))
    const machineName = getDeviceName(author)

    if (ev.httpMethod === 'GET') {
        // get the guestbook
        const sql = `
            -- check seq and return data iff seq is ok
            SELECT email, human_name, body, username
            FROM usr
            WHERE check_seq('${machineName}', ${seq}) = TRUE;
        `
        await client.connect()
        let res:(undefined|Record<string, string>)[]

        try {
            const response = (await client.query(sql))
            console.log('**results**', response)
            res = response.rows
        } catch (err) {
            console.error('error executing query:', err)
            console.log('error to string', err.toString())
            return { body: 'query issue', statusCode: 500 }
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
