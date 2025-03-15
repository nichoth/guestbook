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
 */
export const handler:Handler = async function handler (ev:HandlerEvent) {
    if (ev.httpMethod !== 'POST') {
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
        return { statusCode: 403, body: 'Invalid signature' }
    }

    // query DB
    // check the the given keys are related to a user
    // check the the given `seq` number is ok
    // return the user and their machines
    console.log('**start query**', seq)
    let user:(User & { machines: (Machine & { id })[] })
    try {
        const res = await client.query<
            User & { machines:(Machine & { id })[] }>(fql`
            let machine = Machine.by_did(${author}).first()
            if (machine == null) {
                abort('Invalid key')
            }
            if (machine?.seq <= ${seq}) {
                abort('Invalid sequence number')
            }
            let user = machine?.owner

            user {
                id,
                username,
                humanName,
                machines: Machine.by_owner(user) { humanName, did, id }
            }
        `)

        user = res.data
    } catch (_err) {
        console.log('**caught error**', _err)
        const err = _err as AbortError
        if (err.code === 'abort') {
            return { statusCode: 403, body: err.message }
        }

        return { statusCode: 500, body: err.message }
    }

    console.log('**end query**', user)

    return {
        statusCode: 200,
        body: JSON.stringify(user)
    }
}
