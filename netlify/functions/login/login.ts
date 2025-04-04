import {
    verifyParsed,
    parseHeader,
    type ParsedHeader
} from '@bicycle-codes/request'
import { Resend } from 'resend'
import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { getDeviceName } from '@bicycle-codes/keys'
import { neon } from '@neondatabase/serverless'
import { LoginTemplate } from '../../email-templates/login.js'
import { getDbString, sanitizeHeader } from '../util.js'

/**
 * Get a user record given a machine DID.
 * Also, return the contact list here, b/c it saves a round-trip.
 *   - GET method -- login
 *   - POST method -- create a new one-time login URL
 */
export const handler:Handler = async function handler (ev:HandlerEvent) {
    let BASE_URL = 'https://bellingham.guestlist.town'
    const env = process.env.NODE_ENV
    if (env === 'development') {
        BASE_URL = 'http://localhost:8888'
    } else if (env === 'staging') {
        BASE_URL = 'https://staging--bellingham-guestbook.netlify.app'
    }

    const method = ev.httpMethod
    if (
        method !== 'GET' &&
        method !== 'POST' &&
        method !== 'HEAD' &&
        method !== 'PATCH'
    ) {
        return { statusCode: 405 }
    }

    console.log('**NODE_ENV**', process.env.NODE_ENV)

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
        // this request comes from a new machine
        // get the DID / machine name from the header

        // parse the message, get their email
        let msg:{ email:string }
        try {
            msg = JSON.parse(ev.body!)
            if (!msg.email) throw new Error('Missing email')
        } catch (err) {
            console.log('**invalid json**', ev.body)
            return { statusCode: 422, body: err.toString() }
        }

        const sql = neon(getDbString(process.env))

        const res = await sql`
            INSERT INTO login (
                user_id,
                ts,
                code
            )
            SELECT
                u.id,
                NOW(),
                gen_random_uuid()
            FROM usr u WHERE u.email = ${msg.email}
            RETURNING code, (SELECT human_name 
                ROM usr WHERE usr.email = ${msg.email}) AS human_name;
        `

        if (!res || res.length === 0) {
            console.log('**invalid user or signature**')
            return { statusCode: 422 }
        }

        const { code, human_name: humanName } = res[0]
        const resend = new Resend(process.env.RESEND_KEY)

        resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'nichoth@bicycle.codes',
            subject: 'Your single-use login code',
            html: LoginTemplate({
                loginLink: BASE_URL + `/login/${code}`,
                name: humanName  // Use the human_name in the email template
            })
        })

        return {
            statusCode: 200
        }
    }

    if (method === 'PATCH') {
        // redeem a one-time login code
    }

    return { statusCode: 405 }
}
