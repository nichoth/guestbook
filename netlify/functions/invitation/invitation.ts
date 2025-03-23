import { v4 as uuid } from 'uuid'
import { z } from 'zod'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { Keys, type DID, getDeviceName } from '@bicycle-codes/keys'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { Client } from 'pg'
import { getDbString } from '../util.js'

const ZodDID = z.custom<DID>((val:string) => {
    return (val.startsWith('did:key:z') && val.length < 450)
})

const Request = z.object({
    userData: z.object({
        humanName: z.string().max(100),
        username: z.string().max(36),
        email: z.string().max(100),
        body: z.string().max(6000)
    }),
    machine: z.object({
        humanName: z.string().max(100),
        did: ZodDID,
    }),
    code: z.string().length(36)
})

/**
 * Get, create or accept invitations.
 *
 * To become a member of the website, you must be invited by someone who
 * is already a member (the country-club rule).
 *
 * POST method means create a new invitation
 * PATCH method means redeem an invitation (create a new user)
 * GET does two things
 *   - if you pass a query string with the code, then it is a new potential
 *     user checking that an invitation exists
 *   - if no query string, then it should be an existing user, fetching
 *     the invitations they have created
 */
export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
    const client = new Client(getDbString(process.env))

    if (ev.httpMethod === 'GET') {
        // if theres a query param, then get that one invitation.
        // no auth in that case
        const params = ev.queryStringParameters
        if (!params || !params.code) {
            // if there is not a query param,
            // then get all invitations that the given user has created
            const headerString = ev.headers.authorization
            if (!headerString) {
                return { body: 'Need to authenticate', statusCode: 401 }
            }
            const parsedHeader:ParsedHeader = parseHeader(headerString)
            const { seq, author } = parsedHeader
            const machineName = getDeviceName(author)

            // check signature
            const isOk = await verifyParsed(parsedHeader)   // check signature
            if (!isOk) {
                return { body: 'Invalid signature', statusCode: 403 }
            }

            // check the author & seq in the query
            const sql = `
                SELECT i.id AS code
                FROM invitation i
                JOIN usr u ON i.creator = u.user_id
                JOIN machine m ON m.owner = u.user_id
                WHERE m.machine_name = '${machineName}'
                    AND check_seq(${machineName}, ${seq});
            `

            const res = await client.query(sql)
            return { statusCode: 200, body: JSON.stringify(res.rows) }
        } else {
            // a new person checking an invitation code
            const code = params.code!
            if (code.length !== 36) {
                return { body: 'Bad code', statusCode: 403 }
            }

            try {
                // get the invitation from DB
                const sql = `
                    SELECT * FROM invitation
                    WHERE invitation.id = ${code}
                `
                const res = await client.query(sql)
                return { body: JSON.stringify(res.rows[0]), statusCode: 200 }
            } catch (_err) {
                // query error
                console.log('**error**', _err)
                // TODO
                // better error handling
                return { body: _err.toString(), statusCode: 500 }
            }
        }
    }

    // is either PATCH or POST
    if (!ev.body) return { statusCode: 400 }

    if (ev.httpMethod === 'PATCH') {
        // accept an invitation (create a new user and new machine)
        let data:z.infer<typeof Request>

        try {
            const rawData = JSON.parse(ev.body)
            data = Request.parse(rawData)
        } catch (_err) {
            return { body: 'Invalid JSON', statusCode: 415 }
        }

        const { username, humanName: userHumanName, email, body } = data.userData
        const { code, machine } = data
        const { did, humanName: machineHumanName } = machine
        const slugUsername = userHumanName.split(' ').filter(Boolean).join('_')
        const machineName = await Keys.deviceName(did)

        // check that the given invitation is valid
        try {
            // query DB (check invitation)
            // call the accept function in DB

            // const newUserData:{
            //     id,
            //     humanName
            //     owner:{ id, humanName, username }
            // } = res.data

            // console.log('the new user...', JSON.stringify(newUserData, null, 2))

            // return {
            //     body: JSON.stringify({
            //         user: newUserData.owner,
            //         machine: {
            //             id: newUserData.id,
            //             humanName: newUserData.humanName
            //         }
            //     }),
            //     statusCode: 200
            // }
        } catch (_err) {
            // query error
            // const err = _err as AbortError
            // if (err.code === 'abort') {
            //     return { body: 'Invalid invitation', statusCode: 403 }
            // }

            // if (err.code === 'constraint_failure') {
            //     if (err.queryInfo?.summary?.includes('unique constraint')) {
            //         return { statusCode: 409, body: 'That email is taken.' }
            //     }
            // }

            // console.log('the errrrrrrrrrrrrrr', err)
            // return { statusCode: 500, body: err.message }
        }
    }

    const code = uuid()
    if (ev.httpMethod === 'POST') {
        // create a new invitation
        let data:{
            note:string;
            remainingUses:number;
        }

        try {
            data = JSON.parse(ev.body)
        } catch (_err) {
            return { body: 'Invalid JSON', statusCode: 415 }
        }

        // check that they are a user
        const headerString = ev.headers.authorization
        if (!headerString) return { body: 'Need to authenticate', statusCode: 401 }
        const parsedHeader:ParsedHeader = parseHeader(headerString)
        const { seq, author } = parsedHeader

        // check signature
        const isOk = await verifyParsed(parsedHeader)   // check signature
        if (!isOk) {
            return { body: 'Invalid signature', statusCode: 403 }
        }

        const { note, remainingUses } = data

        let invitation:{ note:string; code:string, remainingUses }
        try {
            // check the user status in query
            // the given machine 'author' must be a current user
            // use `seq` and `author` here
            invitation = { note, code, remainingUses }
        } catch (_err) {
            // query error TODO
            return { body: _err.toString(), statusCode: 500 }
        }

        return { body: JSON.stringify({ invitation }), statusCode: 200 }
    }

    return { statusCode: 405 }
}
