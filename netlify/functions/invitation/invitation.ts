import { v4 as uuid } from 'uuid'
import { z } from 'zod'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { Keys, type DID } from '@bicycle-codes/keys'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { Client, fql, type AbortError } from 'fauna'

const ZodDID = z.custom<DID>((val:string) => val.startsWith('did:key:z'))

const Request = z.object({
    user: z.object({
        username: z.string(),
        humanName: z.string(),
        email: z.string(),
    }),
    machine: z.object({
        humanName: z.string(),
        did: ZodDID,
    }),
    code: z.string()
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
    const secret = Netlify.env.get('FAUNA_SECRET')
    const client = new Client({ secret })

    if (ev.httpMethod === 'GET') {
        const params = ev.queryStringParameters
        if (!params || !params.code) {
            // an existing user, getting the invitations they have created
            const headerString = ev.headers.authorization
            if (!headerString) {
                return { body: 'Need to authenticate', statusCode: 401 }
            }
            const parsedHeader:ParsedHeader = parseHeader(headerString)
            const { seq, author } = parsedHeader

            // check signature
            const isOk = await verifyParsed(parsedHeader)   // check signature
            if (!isOk) {
                return { body: 'Invalid signature', statusCode: 403 }
            }

            // check the author & seq in the query
            const res = await client.query(fql`
                let machine = Machine.by_did(${author})
                if (machine.seq <= ${seq}) {
                    abort('Invalid signature')
                }
                Invitation.by_creator(machine.owner) { code, ts, note, id }
            `)

            return { statusCode: 200, body: JSON.stringify(res.data) }
        } else {
            // a new person checking an invitation code
            const code = params.code!

            try {
                const res = await client.query<{ code, creator }>(fql`
                    let inv = Invitation.by_code(${code}).first()
                    if (inv == null) {
                        abort('Invalid invitation code')
                    } else {
                        inv { code, creator { id, username, humanName } }
                    }
                `)

                return { statusCode: 200, body: JSON.stringify(res.data) }
            } catch (_err) {
                const err = _err as AbortError
                if (err.code === 'abort') {
                    return { statusCode: 404, body: 'Invalid invitation code' }
                } else {
                    console.log('**unexpected error**', err)
                    return { statusCode: 500, body: err.message }
                }
            }
        }
    }

    // is either PATCH or POST
    if (!ev.body) return { statusCode: 400 }

    // redeem an invitation (create a new user)
    if (ev.httpMethod === 'PATCH') {
        let data:z.infer<typeof Request>

        try {
            const rawData = JSON.parse(ev.body)
            data = Request.parse(rawData)
        } catch (_err) {
            return { body: 'Invalid JSON', statusCode: 415 }
        }

        const { username, email, humanName } = data.user
        const { code, machine } = data
        const { did } = machine
        const slugUsername = username.split(' ').filter(Boolean).join('_')
        const machineName = await Keys.deviceName(did)

        // query the DB
        // check that the given invitation is valid
        let newUserData:{ machine, user }
        try {
            const res = await client.query<{ user, machine }>(fql`
                RedeemInvitation(${code})

                let user = User.create({
                    username: ${slugUsername},
                    email: ${email},
                    humanName: ${humanName}
                })

                let machine = Machine.create({
                    did: ${data.machine.did},
                    machineName: ${machineName},
                    humanName: ${data.machine.humanName}
                    owner: user
                })

                {
                    user { username, humanName },
                    machine { id }
                }
            `)
            newUserData = res.data

            console.log('the new user...', JSON.stringify(newUserData, null, 2))
        } catch (_err) {
            const err = _err as AbortError
            if (err.code === 'abort') {
                return { body: 'Invalid invitation', statusCode: 403 }
            }
            return { statusCode: 500, body: err.message }
        }

        return { body: JSON.stringify(newUserData), statusCode: 200 }
    }

    // create a new invitation
    const code = uuid()
    if (ev.httpMethod === 'POST') {
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

        let invitation:{ note:string; code:string }
        try {
            const res = await client.query<{ note, code }>(fql`
                // check sequence has changed
                let machine = Machine.by_did(${author})
                let user = machine?.owner
                if (user == null) {
                    abort('Bad author')
                }
                if (${seq} <= machine?.seq)  {
                    abort('Bad auth')
                }

                Invitation.create({
                    note: ${note},
                    code: ${code},
                    remainingUses: ${remainingUses}
                    creator: user
                })
            `)

            invitation = res.data
        } catch (_err) {
            const err = _err as AbortError
            if (err.code === 'abort') {
                return { body: 'bad auth', statusCode: 403 }
            }

            return { body: _err, statusCode: 500 }
        }

        // we create a new invitation
        return { body: JSON.stringify({ invitation }), statusCode: 200 }
    }

    return { statusCode: 405 }
}
