import { v4 as uuid } from 'uuid'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { Client, fql, type AbortError } from 'fauna'

/**
 * Accept an invitation.
 * To become a member of the website, you must be invited by someone who
 * is already a member (the country-club rule).
 *   - POST method means create a new invitation
 *   - PATCH method means redeem an invitation (create a new user)
 */
export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
    if (!ev.body) return { statusCode: 400 }

    const secret = Netlify.env.get('FAUNA_SECRET')
    const client = new Client({ secret })

    // redeem an invitation (create a new user)
    if (ev.httpMethod === 'PATCH') {
        let data:{
            user: {
                username:string;
                humanName:string;
                email:string;
            };
            code:string;
        }

        try {
            data = JSON.parse(ev.body)
        } catch (_err) {
            return { body: 'Invalid JSON', statusCode: 415 }
        }

        const { username, email, humanName } = data.user
        const { code } = data

        // query the DB
        // check that the given invitation is valid
        let user
        try {
            user = await client.query(fql`
                let inv = Invitation.byCode(${code}).first()
                if (inv == null) {
                    abort('Bad invitation code')
                } else {
                    User.create({
                        username: ${username},
                        email: ${email},
                        humanName: ${humanName}
                    })
                }
            `)

            console.log('the user...', JSON.stringify(user, null, 2))
        } catch (_err) {
            const err = _err as AbortError
            if (err.code === 'abort') {
                return { body: 'Invalid invitation', statusCode: 403 }
            }
        }

        return { body: JSON.stringify(user), statusCode: 200 }
    }

    // create a new invitation
    const code = uuid()
    if (ev.httpMethod === 'POST') {
        let data:{
            note:string;
        }

        try {
            data = JSON.parse(ev.body)
        } catch (_err) {
            return { body: 'Invalid JSON', statusCode: 415 }
        }

        // check that they are a user
        const headerString = ev.headers.Authorization
        if (!headerString) return { body: 'Need to authenticate', statusCode: 401 }
        const parsedHeader:ParsedHeader = parseHeader(headerString)
        const { seq, author } = parsedHeader

        // check signature
        const isOk = await verifyParsed(parsedHeader)   // check signature
        if (!isOk) {
            return { body: 'Invalid signature', statusCode: 403 }
        }

        const { note } = data

        let invitation:{ note:string; code:string }
        try {
            const res = await client.query<{ note, code }>(fql`
                // check sequence has changed
                let user = User.byDID(${author}).first()
                if (user == null) {
                    abort('Bad author')
                }
                if (${seq} >= user?.seq)  {
                    abort('Bad auth')
                }

                Invitation.create({
                    note: ${note},
                    code: ${code}
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
