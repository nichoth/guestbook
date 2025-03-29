import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { getDeviceName } from '@bicycle-codes/keys'
import { neon } from '@neondatabase/serverless'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { getDbString, sanitizeHeader } from '../util.js'

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

    // const res = await sql.query(`
    //     SELECT accept_invitation($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
    // `, [code, machineName, machineHumanName, did, slugUsername,
    //     userHumanName, email, body, bluesky])

    if (ev.httpMethod === 'GET') {
        let res
        try {
            res = await sql`
                -- First, check if check_seq is TRUE for your user
                WITH check_result AS (
                    SELECT check_seq(${machineName}::VARCHAR, ${seq}::INT) AS is_valid
                )
                -- Then, return all users only if the check is valid
                SELECT *
                FROM usr
                WHERE (SELECT is_valid FROM check_result) = TRUE;
            `
        } catch (err) {
            console.error('**error executing query**:', err)
            return { body: 'query error', statusCode: 500 }
        } finally {
            // sql disconnect
        }

        return {
            statusCode: 200,
            body: JSON.stringify((res)
                .filter(r => Boolean(r))
                .map(r => {
                    return {
                        ...r,
                        humanName: r!.human_name
                    }
                })
            )
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

// -- check seq and return data iff seq is ok
// IF NOT (SELECT check_seq(machinename, new_seq)) THEN
//     RAISE EXCEPTION 'Invalid signature';
// END IF;
// SELECT email, human_name, body, username
// FROM usr
