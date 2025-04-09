import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { getDeviceName } from '@bicycle-codes/keys'
import { z } from 'zod'
import slugify from '@sindresorhus/slugify'
import { neon } from '@neondatabase/serverless'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { getDbString, sanitizeHeader } from '../util.js'

const PutRequest = z.object({
    humanName: z.string().max(100),
    email: z.string().max(100),
    body: z.string().max(6000),
    bluesky: z.string().max(100)
})

/**
 * PUT call means add or update the contact info for the given user.
 *   - Must authenticate using the machine key.
 * (PUT is idempotent)
 * GET means return the contact list.
 *
 * Need to auth in both cases.
 */
export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
    if (ev.httpMethod !== 'GET' && ev.httpMethod !== 'PUT') {
        return { statusCode: 405 }
    }

    // check the auth/header
    // always must authenticate for this function
    const headerString = ev.headers.authorization
    if (!headerString) return { body: 'Need to authenticate', statusCode: 401 }
    const parsedHeader:ParsedHeader = parseHeader(headerString)
    const { seq, author } = parsedHeader

    if (!sanitizeHeader(seq, author)) {
        return { body: 'Invalid signature', statusCode: 403 }
    }

    // check signature
    const isOk = await verifyParsed(parsedHeader)   // check signature
    if (!isOk) {
        return { body: 'Invalid signature', statusCode: 403 }
    }

    const machineName = await getDeviceName(author)
    const sql = neon(getDbString(process.env))

    if (ev.httpMethod === 'GET') {
        let res
        try {
            res = await sql`
                -- First, check if check_seq is TRUE for your user
                WITH check_result AS (
                    SELECT check_seq(${machineName}::VARCHAR, ${seq}::INT) AS is_valid
                )
                -- Then, return all users only if the check is valid
                SELECT * FROM usr
                WHERE (SELECT is_valid FROM check_result) = TRUE;
            `
        } catch (err) {
            console.error('**error executing query**:', err)
            return { body: 'query error', statusCode: 500 }
        }

        return {
            statusCode: 200,
            body: JSON.stringify((res).filter(r => Boolean(r))
                .map(r => {
                    return {
                        ...r,
                        humanName: r.human_name
                    }
                })
            )
        }
    }

    /**
     * method is PUT
     *   - write to the DB
     *   - upsert
     */

    // parse the incoming request
    if (!ev.body) return { statusCode: 400 }
    let data:z.infer<typeof PutRequest>

    try {
        const rawData = JSON.parse(ev.body)
        data = PutRequest.parse(rawData)
    } catch (err) {
        return { body: err.message, statusCode: 422 }
    }

    const trimmed = Object.keys(data).reduce((acc, k) => {
        acc[k] = data[k].trim()
        return acc
    }, {} as z.infer<typeof PutRequest>)
    const { body, email } = trimmed
    const username = slugify(data.humanName, { separator: '_' })

    if (email.length > 100 || username.length > 100) {
        return { statusCode: 413 }
    }
    if (body.length > 6000) {
        return { statusCode: 413 }
    }

    // update the user record in the DB
    await sql`
        INSERT INTO usr (
            human_name,
            email,
            username,
            bluesky,
            body
        ) VALUES (
            ${data.humanName},
            ${email},
            ${username},
            ${data.bluesky},
            ${data.body}
        );
    `

    return { statusCode: 204 }
}
