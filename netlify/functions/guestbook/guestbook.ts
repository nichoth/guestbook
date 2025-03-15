import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { Client, fql } from 'fauna'

/**
 * PUT call means add or update the contact info for the given user.
 *   - Must authenticate using the machine key.
 *
 */
export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
    if (ev.httpMethod !== 'GET' && ev.httpMethod !== 'PUT') {
        return { statusCode: 405 }
    }

    if (ev.httpMethod === 'GET') {
        // get the guestbook

        return {
            statusCode: 200,
            body: JSON.stringify({ hello: 'hello' })
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

    // no spaces
    const slugUsername = username.split(' ').filter(Boolean).join('_')

    if (!slugUsername) {
        return { statusCode: 401 }
    }

    // update the DB
    const client = new Client({
        secret: Netlify.env.get('FAUNA_SECRET')
    })
    client.query(fql`
        let machine = Machine.by_did(${author})
        if (machine.seq <= ${seq}) {
            abort('Bad signature')
        }
        let user = machine.owner

        user.update(${data})
    `)

    return {
        statusCode: 200,
        body: JSON.stringify({ hello: 'hello' })
    }
}
