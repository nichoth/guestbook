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

    if (method === 'GET') {
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

        // parse the message, get their email
        let msg:{ email:string }
        try {
            msg = JSON.parse(ev.body!)
            if (!msg.email) throw new Error('Missing email')
        } catch (err) {
            console.log('**invalid json**', ev.body)
            return { statusCode: 422, body: err.toString() }
        }

        const email = msg.email.trim()

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
            FROM usr u WHERE u.email = ${email}
            RETURNING code, (SELECT human_name 
                FROM usr WHERE usr.email = ${email}) AS human_name;
        `

        if (!res || res.length === 0) {
            console.log('**invalid email**', email)
            return { statusCode: 422 }
        }

        const { code, human_name: humanName } = res[0]
        const resend = new Resend(process.env.RESEND_KEY)

        const { error } = await resend.emails.send({
            from: 'mail@bellingham.guestlist.town',
            to: [email],
            subject: 'Your single-use login code',
            html: LoginTemplate({
                loginLink: BASE_URL + `/login/${code}`,
                name: humanName
            })
        })

        if (error) {
            console.log('**error**', error)
            return { statusCode: 500, body: error.message }
        } else {
            return {
                statusCode: 200
            }
        }
    }

    if (method === 'PATCH') {
        // redeem a one-time login code
        //   - get the keys from the header
        //   - check the timestamp is within 5 minutes
        //   - add the keys as a new machine record
        //   - delete the login record

        // get the key from the header //
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

        // parse the message, get their code
        let msg:{ code:string, machineHumanName:string }
        try {
            msg = JSON.parse(ev.body!)
            if (!msg.code) throw new Error('Missing code')
            if (!msg.machineHumanName) throw new Error('Missing machine name')
        } catch (err) {
            console.log('**invalid json**', ev.body)
            return { statusCode: 422, body: err.message }
        }

        const code = msg.code.trim()
        const machineHumanName = msg.machineHumanName.trim()

        const sql = neon(getDbString(process.env))

        try {
            // Add the new machine record, delete the login record,
            // and return the user record
            const res = await sql`
                WITH deleted_login AS (
                    DELETE FROM login
                    WHERE code = ${code}
                      AND ts > NOW() - INTERVAL '5 minutes'
                    RETURNING user_id
                ),
                inserted_machine AS (
                    INSERT INTO machine (
                        machine_name,
                        machine_owner,
                        did,
                        seq,
                        human_name
                    )
                    SELECT
                        ${machineName},
                        user_id,
                        ${parsedHeader.author},
                        ${seq},
                        ${machineHumanName}
                    FROM deleted_login
                    RETURNING machine_owner
                )
                SELECT
                    u.id,
                    u.email,
                    u.username,
                    u.human_name,
                    u.bluesky,
                    u.body
                FROM usr u
                WHERE u.id = (SELECT user_id FROM deleted_login);
            `

            if (!res || res.length === 0) {
                console.log('**invalid or expired code**', code)
                return { statusCode: 403, body: 'Invalid or expired code' }
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ user: res[0] })
            }
        } catch (err) {
            console.log('**error**', err)
            return { statusCode: 500, body: 'Database error' }
        }
    }

    return { statusCode: 405 }
}
