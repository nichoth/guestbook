import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'

export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
    if (ev.httpMethod !== 'POST') {
        return { statusCode: 405 }
    }

    // query the DB
    // check that the given username matches the given public key
    // return the user record

    return {
        statusCode: 200,
        body: JSON.stringify({ hello: 'hello' })
    }
}
