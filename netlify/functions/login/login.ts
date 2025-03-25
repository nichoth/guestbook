import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { Client, type DatabaseError } from 'pg'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { type DID, getDeviceName } from '@bicycle-codes/keys'
import { getDbString, sanitizeHeader } from '../util.js'
import type { User } from '../../../src/types.js'

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
    const client = new Client(getDbString(process.env))
    await client.connect()
    let data:({
        user:User,
        machines: ({
            machine_name:string;
            human_name:string;
            did:DID
        })[]
    })
    const machineName = await getDeviceName(author)

    const sql = `
        SELECT check_seq_and_get_user('${machineName}', ${seq});
    `

    try {
        const res = await client.query(sql)
        console.log('**db response**', JSON.stringify(res.rows[0], null, 2))
        data = res.rows[0].check_seq_and_get_user
    } catch (_err) {
        console.log('**error**', _err)
        const err = _err as DatabaseError
        if (err.message.includes('sequence number')) {
            console.log('err msg', err.message)
            console.log('seq', seq)
            return { body: 'Invalid sequence number', statusCode: 403 }
        }

        console.log('**unhandled error**', err)
        return { statusCode: 500 }
    }

    const { machines, user } = data

    return {
        statusCode: 200,
        body: JSON.stringify({
            user,
            machines: machines.map(machine => {
                return {
                    machineName: machine.machine_name,
                    humanName: machine.human_name,
                }
            })
        })
    }
}
