import 'dotenv/config'
import { z } from 'zod'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { type DID, getDeviceName } from '@bicycle-codes/keys'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { Client } from 'pg'
import { getDbString, sanitizeHeader } from '../util.js'
import { neon } from '@neondatabase/serverless'

const ZodDID = z.custom<DID>((val:string) => {
    return (val.startsWith('did:key:z') && val.length < 450)
})

const Request = z.object({
    userData: z.object({
        humanName: z.string().max(100),
        email: z.string().max(100),
        body: z.string().max(6000),
        bluesky: z.string().max(100)
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
    const envVar = getDbString(process.env)
    const client = new Client(envVar)

    if (ev.httpMethod === 'GET') {
        // if theres not a query param,
        // then get all invitations created by the user
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

            await client.connect()

            // check the author & seq in the query
            const sql = `
                SELECT i.id AS code
                FROM invitation i
                JOIN usr u ON i.creator = u.email
                JOIN machine m ON m.owner = u.email
                WHERE m.machine_name = '${machineName}'
                    AND check_seq('${machineName}', '${seq}');
            `

            const res = await client.query(sql)
            console.log('**invitations**', JSON.stringify(res.rows, null, 2))
            return { statusCode: 200, body: JSON.stringify(res.rows) }
        } else {
            // if there is a query param, then get the specific invitation
            // no auth
            const code = params.code!
            if (code.length !== 36) {
                return { body: 'Bad code', statusCode: 403 }
            }
            // await client.connect()
            const sql = neon(getDbString(process.env))

            try {
                const res = await sql`
                    SELECT 
                        i.id AS code,
                        i.remaining,
                        i.note,
                        i.creator AS creator_email,
                        u.username AS creator_username,
                        u.human_name AS creator_human_name,
                        u.body AS creator_body
                    FROM invitation i
                    JOIN usr u
                    ON i.creator = u.email
                    WHERE i.id = ${code}
                `

                const {
                    creator_email: creatorEmail,
                    creator_username: creatorUsername,
                    creator_human_name: creatorHumanName,
                    ...inv
                } = res[0]

                return {
                    // rename id to code
                    body: JSON.stringify({
                        ...inv,
                        creator: {
                            email: creatorEmail,
                            username: creatorUsername,
                            humanName: creatorHumanName
                        }
                    }),
                    statusCode: 200
                }
            } catch (err) {
                console.log('**query error**', err)
                return { body: err.toString(), statusCode: 500 }
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
            console.log('**error parsing**', _err)
            return { body: 'Invalid JSON', statusCode: 415 }
        }

        // parsed with zod, so it is ok
        const { bluesky, humanName: userHumanName, email, body } = data.userData
        const { code, machine } = data
        const { did, humanName: machineHumanName } = machine
        const slugUsername = userHumanName.split(' ').filter(Boolean).join('_')
        const machineName = await getDeviceName(did)
        await client.connect()

        // check that the given invitation is valid
        try {
            // check invitation
            // call the accept function in DB
            const sql = `
                SELECT accept_invitation(
                    '${code}',
                    '${machineName}',
                    '${machineHumanName}',
                    '${did}',
                    '${slugUsername}',
                    '${userHumanName}',
                    '${email}',
                    '${body}',
                    '${bluesky}'
                )
            `

            const res = await client.query(sql)

            return {
                body: JSON.stringify(res.rows[0].accept_invitation),
                statusCode: 200
            }
        } catch (_err) {
            // query error
            console.log('**query error**', _err.toString())
            const err = _err.toString()
            if (err.includes('usr_pkey')) {
                return { body: 'That email is taken', statusCode: 409 }
            }

            return { body: err, statusCode: 500 }
        } finally {
            await client.end()
        }
    }

    if (ev.httpMethod === 'POST') {
        // create a new invitation

        const Req = z.object({
            note: z.string().max(6000),
            remainingUses: z.number().max(500, 'Max 100 uses per invitation')
        })

        let data:z.infer<typeof Req>

        try {
            const rawData = JSON.parse(ev.body)
            data = Req.parse(rawData)
        } catch (_err) {
            return { body: 'Invalid JSON', statusCode: 415 }
        }

        // check that they are a user
        const headerString = ev.headers.authorization
        if (!headerString) {
            return { body: 'Need to authenticate', statusCode: 401 }
        }

        const parsedHeader:ParsedHeader = parseHeader(headerString)
        const { seq, author } = parsedHeader

        if (!sanitizeHeader(seq, author)) {
            return { body: 'Invalid header', statusCode: 403 }
        }

        // check signature
        const isOk = await verifyParsed(parsedHeader)   // check signature
        if (!isOk) {
            return { body: 'Invalid signature', statusCode: 403 }
        }

        const { note, remainingUses } = data
        const machineName = getDeviceName(author)
        // note & remainingUses are ok now b/c we validated with zod
        await client.connect()

        let invitation
        try {
            // check the user status in query
            // the given machine 'author' must be a current user

            const sql = `
                INSERT INTO invitation (
                    remaining,
                    creator,
                    note
                ) VALUES (
                    ${remainingUses},
                    (SELECT owner
                    FROM machine
                    WHERE machine_name = ${machineName}),
                    ${note}
                )
            `

            invitation = await client.query(sql)
            console.log('**created an invitation**', invitation)
        } catch (_err) {
            console.log('**query error**', _err)
            return { body: _err.toString(), statusCode: 500 }
        } finally {
            await client.end()
        }

        return {
            body: JSON.stringify({ invitation: invitation.rows }),
            statusCode: 200
        }
    }

    return { body: null, statusCode: 405 }
}
