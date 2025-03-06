import { Client } from 'fauna'
import type {
    Handler,
    HandlerEvent,
    // HandlerContext
} from '@netlify/functions'

export const handler:Handler = async function handler (
    ev:HandlerEvent,
    // ctx:HandlerContext
) {
    if (ev.httpMethod !== 'GET' && ev.httpMethod !== 'POST') {
        return { statusCode: 405 }
    }

    const secret = process.env.FAUNA_SECRET
    const client = new Client({ secret })

    if (ev.httpMethod === 'GET') {
        // get the guestbook

        return {
            statusCode: 200,
            body: JSON.stringify({ hello: 'hello' })
        }
    }

    /**
     * must be POST
     *   - write to the DB
     */

    return {
        statusCode: 200,
        body: JSON.stringify({ hello: 'hello' })
    }
}
