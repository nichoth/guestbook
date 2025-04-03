import 'dotenv/config'
import { z } from 'zod'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import { getDbString, verifyHeader } from '../util.js'
import slugify from '@sindresorhus/slugify'

const Request = z.object({
    humanName: z.optional(z.string().max(100)),
    email: z.string().max(100),
    body: z.optional(z.string().max(6000)),
    bluesky: z.optional(z.string().max(100))
})

/**
 * Edit the given user.
 */
export const handler:Handler = async function handler (ev:HandlerEvent) {
    if (ev.httpMethod !== 'PUT') {
        return { statusCode: 405 }
    }

    if (!ev.body) return { statusCode: 400 }

    let machineName:string
    let seq:number
    try {
        const [name, sequence] = await verifyHeader(ev)
        machineName = name
        seq = sequence
    } catch (_err) {
        const err = _err as Error
        return {
            body: err.message,
            statusCode: err.message.includes('authenticate') ? 401 : 403
        }
    }

    let data:{
        email:string;
        body?:string;
        bluesky?:string;
        humanName?:string;
    }
    try {
        const rawData = JSON.parse(ev.body)
        data = Request.parse(rawData)
    } catch (_err) {
        console.log('**error parsing**', _err)
        return { body: 'Invalid JSON', statusCode: 415 }
    }

    const newUsername = (data.humanName ?
        slugify(data.humanName, { separator: '_' }) :
        null)

    const sql = neon(getDbString(process.env))
    await sql`
        -- Validate the machine name using the check_seq function
        -- and update the user record if valid
        WITH valid_user AS (
            SELECT u.id
            FROM usr u
            JOIN machine m ON m.owner = u.id
            WHERE m.machine_name = ${machineName}
            AND check_seq(${machineName}, ${seq}) = TRUE
        )
        UPDATE usr
        SET
            human_name = COALESCE(${data.humanName}, human_name),
            body = COALESCE(${data.body}, body),
            username = COALESCE(${newUsername}, username),
            bluesky = COALESCE(${data.bluesky}, bluesky),
            ts = NOW()
        WHERE id = (SELECT id FROM valid_user)
        RETURNING *;
    `

    return { statusCode: 204 }
}
