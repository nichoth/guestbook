import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
// import { Client, type DatabaseError } from 'pg'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
// import { type DID, getDeviceName } from '@bicycle-codes/keys'
import { getDeviceName } from '@bicycle-codes/keys'
import { neon } from '@neondatabase/serverless'
import { getDbString, sanitizeHeader } from '../util.js'

/**
 * Get a user record given a machine DID.
 * Also, return the contact list here, b/c it saves a round-trip.
 */
export const handler:Handler = async function handler (ev:HandlerEvent) {
    if (ev.httpMethod !== 'GET') {
        return { statusCode: 405 }
    }
    const headerString = ev.headers.authorization
    if (!headerString) return { body: 'Need to authenticate', statusCode: 401 }
    const parsedHeader:ParsedHeader = parseHeader(headerString)
    const { seq, author } = parsedHeader

    if (!sanitizeHeader(seq, author)) {
        return { body: 'Invalid header', statusCode: 403 }
    }

    const isOk = await verifyParsed(parsedHeader)   // check signature
    if (!isOk) {
        console.log('**bad sig**', parsedHeader)
        return { statusCode: 403, body: 'Invalid signature' }
    }

    // query the DB
    // check the the given keys are related to a user
    // check the the given `seq` number is ok
    // return the user and their machines

    let data:{ check_seq_and_get_user:{ user, machines } }
    const machineName = await getDeviceName(author)

    const sql = neon(getDbString(process.env))
    try {
        const result = await sql`
            SELECT check_seq_and_get_user(${machineName}, ${seq});
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
            console.log('seq', seq)
            return { body: 'Invalid sequence number', statusCode: 403 }
        }

        return { body: 'query error', statusCode: 500 }
    }
}
