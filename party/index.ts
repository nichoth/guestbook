import { Connection } from '@hello-system/connect/server'
import { Client, type DatabaseError } from 'pg'
import type * as Party from 'partykit/server'
import { getDeviceName } from '@bicycle-codes/keys'
import {
    type ParsedHeader,
    parseHeader,
    verifyParsed
} from '@bicycle-codes/request'
import { getDbString, sanitizeHeader } from '../netlify/functions/util'

interface JSONObject {
    [x:string]:JSONValue;  // eslint-disable-line
}

type JSONValue = string | number | boolean | JSONObject;

export default class Server extends Connection implements Party.Server {
    /**
     * This is a POST request from the existing machine.
     */
    async auth (req:Party.Request) {
        if (req.method !== 'POST') {
            return new Response(null, {
                status: 405
            })
        }

        // first connection
        // check the auth header, then open the room
        const token = req.headers.get('authorization') ?? ''
        if (!token) {
            return new Response('Missing auth header', {
                status: 401,
                headers: Connection.CORS
            })
        }

        let header:ParsedHeader
        try {
            header = parseHeader<{ seq }>(token)
            if (!(await verifyParsed(header))) {
                throw new Error('bad header signature')
            }
        } catch (_err) {
            // header parse failed
            return new Response('Invalid header', {
                status: 403,
                headers: Connection.CORS
            })
        }

        const { seq, author } = header
        if (!sanitizeHeader(seq, author)) {
            return new Response('Invalid header', {
                status: 403,
                headers: Connection.CORS
            })
        }

        const machineName = await getDeviceName(author)

        // check that the machine is in the database
        const sql = `
            SELECT check_seq('${machineName}', ${seq});
        `

        const client = new Client(getDbString(process.env))
        await client.connect()
        try {
            const { check_seq: check } = (await client.query(sql)).rows[0]
            if (!check) {
                return new Response(null, {
                    status: 403,
                    headers: Connection.CORS
                })
            }
        } catch (_err) {
            const err = _err as DatabaseError
            console.log('**query error**', err)
            return new Response(null, {
                status: 500,
                headers: Connection.CORS
            })
        } finally {
            await client.end()
        }

        // the parent class reads the response code returned here
        return new Response(null, { status: 200, headers: Connection.CORS })
    }

    /**
     * The new machine has been verified by the original machine.
     */
    async onApprove (msg:string):Promise<this> {
        console.log('approved this machine', msg)

        const { machineName } = JSON.parse(msg)
        // add the new machine to a database
        const sql = `
        INSERT INTO machine (
            machine_name,
            owner,
            did,
            seq,
            human_name
        ) VALUES (
            '${machineName}',
            (SELECT email FROM usr WHERE usr.email = 'test@beef.com'),
            'did:key:zstring',
            0,
            'Phone'
        );,
        `
        const client = new Client(getDbString(process.env))
        await client.connect()
        await client.query(sql)

        return this
    }

    /**
     * The new machine has been rejected.
     */
    async onReject (msg:JSONObject):Promise<this> {
        console.log('reject this machine', msg)
        return this
    }
}

Server satisfies Party.Worker
