import { Handler, HandlerEvent } from '@netlify/functions'

export const handler:Handler = async function handler (ev:HandlerEvent) {
    if (ev.httpMethod !== 'GET') return { statusCode: 405 }

    return { statusCode: 200, body: JSON.stringify({ hello: 'hello' }) }
}
