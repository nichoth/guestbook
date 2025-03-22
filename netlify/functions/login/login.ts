import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { type AbortError, Client, fql } from 'fauna'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import type { User, Machine } from '../../../src/types.js'

/**
 * Get a user record given a machine DID.
 * Also, return the contact list here, b/c it saves a round-trip.
 */
export const handler:Handler = async function handler (ev:HandlerEvent) {
    if (ev.httpMethod !== 'GET') {
        return { statusCode: 405 }
    }
    const secret = Netlify.env.get('FAUNA_SECRET')
    const client = new Client({ secret })

    const headerString = ev.headers.authorization
    if (!headerString) return { body: 'Need to authenticate', statusCode: 401 }
    const parsedHeader:ParsedHeader = parseHeader(headerString)
    const { seq, author } = parsedHeader
    const isOk = await verifyParsed(parsedHeader)   // check signature
    if (!isOk) {
        console.log('**bad sig**', parsedHeader)
        return { statusCode: 403, body: 'Invalid signature' }
    }

    // query DB
    // check the the given keys are related to a user
    // check the the given `seq` number is ok
    // return the user and their machines
    let user:(User & { machines: { data:(Machine & { id })[] } })
    try {
        const res = await client.query<User & {
            machines:{ data:(Machine & { id })[] }
            // eslint-disable-next-line indent
        }>(fql`
            let machine = Machine.by_did(${author}).first()
            if (machine == null) {
                abort('Invalid key')
            }
            if (machine?.seq >= ${seq}) {
                abort('Invalid sequence number')
            }
            let user = machine?.owner

            // also get the contact list

            user {
                id,
                email,
                username,
                body,
                humanName,
                machines: Machine.by_owner(user) { humanName, did, id }
            }
        `)

        user = res.data
    } catch (_err) {
        const err = _err as AbortError
        if (err.code === 'abort') {
            if (err.abort?.toString().includes('sequence number')) {
                console.log('**bad sequence**', err)
                return { statusCode: 403, body: 'Bad signature' }
            }

            return { statusCode: 401, body: err.message }
        }

        console.log('**unhandled error**', _err)
        return { statusCode: 500, body: err.message }
    }

    const { machines, ...userData } = user

    return {
        statusCode: 200,
        body: JSON.stringify({
            user: userData,
            machines: machines.data
        })
    }
}
