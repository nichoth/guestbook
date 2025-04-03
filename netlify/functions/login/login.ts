import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { getDeviceName } from '@bicycle-codes/keys'
import { neon } from '@neondatabase/serverless'
import { getDbString, sanitizeHeader } from '../util.js'

/**
 * Get a user record given a machine DID.
 * Also, return the contact list here, b/c it saves a round-trip.
 *   - GET method -- login
 *   - POST method -- create a new one-time login URL
 */
export const handler:Handler = async function handler (ev:HandlerEvent) {
    const method = ev.httpMethod
    if (
        method !== 'GET' &&
        method !== 'POST' &&
        method !== 'HEAD' &&
        method !== 'PATCH'
    ) {
        return { statusCode: 405 }
    }

    // this is for the CLI tool `wait-on`
    if (ev.httpMethod === 'HEAD') return { statusCode: 200 }

    let machineName:string
    let seq:number

    if (method === 'GET' || method === 'POST') {
        const headerString = ev.headers.authorization
        if (!headerString) {
            return { body: 'Need to authenticate', statusCode: 401 }
        }
        const parsedHeader:ParsedHeader = parseHeader(headerString)
        const { seq: _seq, author } = parsedHeader
        seq = _seq
        machineName = await getDeviceName(author)

        if (!sanitizeHeader(seq, author)) {
            return { body: 'Invalid header', statusCode: 403 }
        }

        const isOk = await verifyParsed(parsedHeader)   // check signature
        if (!isOk) {
            console.log('**bad sig**', parsedHeader)
            return { statusCode: 403, body: 'Invalid signature' }
        }
    }

    if (method === 'GET') {
        // query the DB
        // check the the given keys are related to a user
        // check the the given `seq` number is ok
        // return the user and their machines

        let data:{ check_seq_and_get_user:{ user, machines } }

        const sql = neon(getDbString(process.env))
        try {
            const result = await sql`
                SELECT check_seq_and_get_user(${machineName!}, ${seq!});
            `
            data = result[0] as { check_seq_and_get_user:{ user, machines } }

            const { machines, user } = data.check_seq_and_get_user

            return {
                statusCode: 200,
                body: JSON.stringify({
                    user: {
                        ...user,
                        humanName: user.human_name
                    },
                    machines: machines.map(machine => {
                        return {
                            machineName: machine.machine_name,
                            humanName: machine.human_name,
                        }
                    })
                })
            }
        } catch (_err) {
            console.log('**login error**', _err.toString())
            const err = _err as Error
            console.log('**err.message**', err.message)
            if (err.message.includes('sequence number')) {
                console.log('err msg', err.message)
                console.log('seq', seq!)
                return { body: 'Invalid sequence number', statusCode: 403 }
            }

            return { body: 'query error', statusCode: 500 }
        }
    }

    if (method === 'POST') {
        // create a one-time login URL
        const sql = neon(getDbString(process.env))

        const res = await sql`
            WITH valid_user AS (
                -- Step 1: Validate the user by checking the sequence number
                SELECT u.id AS user_id FROM usr u
                JOIN machine m ON m.owner = u.id
                WHERE m.machine_name = ${machineName!}
                AND check_seq(${machineName!}, ${seq!}) = TRUE
                LIMIT 1
            )
            -- Step 2: Insert a new login record if the user is valid
            INSERT INTO login (
                usr,
                ts,
                code
            )
            SELECT
                valid_user.id,
                NOW(),
                gen_random_uuid()
            FROM valid_user
            RETURNING code;
        `

        if (res.length === 0) {
            console.log('**invalid user or signature**')
            return { statusCode: 422 }
        }

        return { statusCode: 200 }
    }

    if (method === 'PATCH') {
        // redeem a one-time login code
    }

    return { statusCode: 405 }
}
