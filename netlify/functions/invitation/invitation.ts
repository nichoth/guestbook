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
import slugify from '@sindresorhus/slugify'
import { neon } from '@neondatabase/serverless'
import { getDbString, sanitizeHeader, verifyHeader } from '../util.js'
// import { neonConfig, Client } from '@neondatabase/serverless'
// import ws from 'ws'

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
 * DELETE -- delete an invitation
 * GET does two things
 *   - if you pass a query string with the code, then it is a new potential
 *     user checking that an invitation exists
 *   - if no query string, then it should be an existing user, fetching
 *     the invitations they have created
 */
export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
    if (ev.httpMethod === 'DELETE') {
        let machineName:string
        let seq:number
        try {
            const [name, sequence] = await verifyHeader(ev)
            machineName = name
            seq = sequence
        } catch (_err) {
            const err = _err as Error
            return {
                body: err.message,
                statusCode: err.message.includes('authenticate') ? 401 : 403
            }
        }

        // parse request
        let req:{ code:string }
        try {
            req = JSON.parse(ev.body!)
            if (!req.code) {
                console.log('**error no code**')
                throw new Error('Need a code.')
            }
        } catch (_err) {
            const err = _err as Error
            console.log('**error parsing**', err)
            return {
                body: err.message.includes('code') ?
                    err.message :
                    'Invalid JSON',
                statusCode: 422,
            }
        }

        const { code } = req
        const sql = neon(getDbString(process.env))
        const res = await sql`
            WITH seq_check AS (
                SELECT check_seq(${machineName}, ${seq}) AS seq_valid
            ),
            invitation_exists AS (
                SELECT id
                FROM invitation
                WHERE id = ${code}
            ),
            delete_invitation AS (
                DELETE FROM invitation
                WHERE id = ${code}
                AND (SELECT seq_valid FROM seq_check)
                RETURNING id
            )
            SELECT
                (SELECT seq_valid FROM seq_check) AS seq_valid,
                (SELECT id IS NOT NULL FROM invitation_exists) AS invitation_found,
                (SELECT id FROM delete_invitation) AS deleted_id
        `

        const {
            seq_valid: seqOk,
            invitation_found: invitationExists,
            deleted_id: deletedId
        } = res[0]

        if (!seqOk) {
            return {
                body: 'Invalid sequence number',
                statusCode: 403
            }
        }

        if (!invitationExists) {
            return {
                body: 'Invitation not found',
                statusCode: 404
            }
        }

        if (!deletedId) {
            return {
                body: 'Delete failed.',
                statusCode: 500
            }
        }

        return { body: null, statusCode: 204 }
    }

    if (ev.httpMethod === 'GET') {
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
            const machineName = await getDeviceName(author)

            // check signature
            const isOk = await verifyParsed(parsedHeader)   // check signature
            if (!isOk) {
                return { body: 'Invalid signature', statusCode: 403 }
            }

            // get all my invitations
            // check the author & seq in the query
            const sql = neon(getDbString(process.env))
            const res = await sql`
                WITH valid_machine AS (
                    SELECT owner
                    FROM machine
                    WHERE machine_name = ${machineName}
                    AND check_seq(${machineName}, ${parseInt(seq)}) = TRUE
                )
                SELECT i.id AS code, i.remaining, i.creator, i.note, i.ts, i.initial
                FROM invitation i
                JOIN usr u ON i.creator = u.email
                JOIN valid_machine vm ON u.email = vm.owner;
            `

            if (res.length === 0) {
                return { body: 'Bad sequence number', statusCode: 403 }
            }

            return { statusCode: 200, body: JSON.stringify(res) }
        } else {
            // if there is a query param, then get a specific invitation
            // no auth
            const code = params.code!.trim()
            if (code.length !== 36) {
                return { body: 'Bad code', statusCode: 403 }
            }

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
        const slugUsername = slugify(userHumanName, {
            separator: '_'
        })
        const machineName = await getDeviceName(did)

        try {
            // check invitation
            // call the accept function in DB
            const sql = neon(getDbString(process.env))
            console.log('**NODE_ENV**', process.env.NODE_ENV)

            const res = await sql.query(`
                SELECT accept_invitation($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [code, machineName, machineHumanName, did, slugUsername,
                userHumanName, email, body, bluesky])

            return {
                body: JSON.stringify(res),
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
        }
    }

    if (ev.httpMethod === 'POST') {
        // create a new invitation

        const Req = z.object({
            note: z.string().max(6000),
            uses: z.coerce.number().max(500, 'Max 500 uses per invitation')
        })

        let data:z.infer<typeof Req>

        try {
            const rawData = JSON.parse(ev.body)
            data = Req.parse(rawData)
        } catch (_err) {
            return { body: 'Invalid JSON', statusCode: 415 }
        }

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

        const { note, uses } = data
        const machineName = await getDeviceName(author)

        try {
            const sql = neon(getDbString(process.env))

            /**
             * HTTP POST
             */
            console.log('**NODE_ENV**', process.env.NODE_ENV)

            const res = await sql`
                WITH seq_check AS (
                    SELECT check_seq(${machineName}, ${seq}) AS seq_valid
                ),
                new_invitation AS (
                    INSERT INTO invitation (
                        remaining,
                        initial,
                        creator,
                        note
                    )
                    SELECT
                        ${uses} AS remaining,
                        ${uses} AS initial,
                        u.email AS creator,
                        ${note} AS note
                    FROM machine m
                    JOIN usr u ON u.email = m.owner
                    WHERE m.machine_name = ${machineName}
                        AND (SELECT seq_valid FROM seq_check)
                    RETURNING *
                )
                SELECT * FROM new_invitation;
            `

            console.log('**the new invitation**', res)

            if (res.length === 0) {
                console.log('**the sequence**', seq)
                console.log('**the machine name**', machineName)
                // returns nothing if the `check_seq` call fails
                return {
                    body: 'Invalid signature',
                    statusCode: 403
                }
            }

            return { body: JSON.stringify(res[0]), statusCode: 200 }
        } catch (_err) {
            console.log('**query error**', _err)
            return { body: _err.toString(), statusCode: 500 }
        }
    }

    return { body: null, statusCode: 405 }
}
