import 'dotenv/config'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { getDeviceName } from '@bicycle-codes/keys'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { neon } from '@neondatabase/serverless'
import { getDbString, sanitizeHeader } from '../util.js'

/**
 * Delete a machine by machine name.
 * Takes JSON with one property, `machineName`.
 */
export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
    if (ev.httpMethod !== 'DELETE') {
        return { body: null, statusCode: 405 }
    }

    // parse the body
    let machineToDelete:string
    try {
        const body:{ machineName } = JSON.parse(ev.body!)
        machineToDelete = body.machineName
    } catch (_err) {
        console.log('**bad json**', ev.body)
        return { body: 'Invalid JSON', statusCode: 422 }
    }

    let author:string, seq:number
    try {
        // verify header
        const headerString = ev.headers.authorization
        if (!headerString) {
            return { body: 'Need to authenticate', statusCode: 401 }
        }
        const parsedHeader:ParsedHeader = parseHeader(headerString)
        const { seq: _seq, author: _author } = parsedHeader
        author = _author
        seq = _seq
        if (!sanitizeHeader(seq, author)) {
            return { body: 'Invalid header', statusCode: 403 }
        }

        // check signature
        const isOk = await verifyParsed(parsedHeader)
        if (!isOk) {
            return { body: 'Invalid signature', statusCode: 403 }
        }
    } catch (err) {
        return { body: err.toString(), statusCode: 403 }
    }

    const machineName = await getDeviceName(author)

    // Verify the author using the check_seq function,
    // delete the machine
    const sql = neon(getDbString(process.env))
    await sql`
        DELETE FROM machine
        WHERE machine_name = ${machineToDelete}
        AND EXISTS (
            SELECT 1
            FROM usr u
            -- machine must be related to the user
            JOIN machine m ON u.email = m.machine_owner
            WHERE m.machine_name = ${machineToDelete}
            -- verify the machine making the request is ok
            AND check_seq(${machineName}, ${seq}) = TRUE
        );
    `

    return { statusCode: 204 }
}
