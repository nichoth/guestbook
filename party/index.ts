import { Connection } from '@hello-system/connect/server'
import { neon } from '@neondatabase/serverless'
import type * as Party from 'partykit/server'
import { getDeviceName, type DID } from '@bicycle-codes/keys'
import {
    type ParsedHeader,
    parseHeader,
    verifyParsed
} from '@bicycle-codes/request'
import { sanitizeHeader } from '../netlify/functions/util'
import { getDbString } from './util.js'

interface JSONObject {
    [x:string]:JSONValue;  // eslint-disable-line
}

type JSONValue = string | number | boolean | JSONObject;

/**
 * In here, call Neon DB.
 */
export default class Server extends Connection implements Party.Server {
    readonly room:Party.Room
    newMachine?:{ did, humanName }
    oldMachine?:{ machineName:string, did:DID }
    sql:ReturnType<typeof neon>

    constructor (room:Party.Room) {
        super(room)
        const env = room.env as { NODE_ENV, NEON_URL }
        this.room = room
        this.sql = neon(getDbString(env))
    }

    /**
     * This is a POST request from the existing machine.
     */
    async auth (req:Party.Request) {
        if (req.method !== 'POST') {
            return new Response(null, {
                status: 405,
                headers: Connection.CORS
            })
        }

        // this is called on first connection only
        // check if the `seq` number in the request is valid
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
            console.log('**bad header**', _err)
            return new Response('Invalid header', {
                status: 403,
                headers: Connection.CORS
            })
        }

        const { seq, author } = header
        if (!sanitizeHeader(seq, author)) {
            console.log('**not sanitize**', seq, author)
            return new Response('Invalid header', {
                status: 403,
                headers: Connection.CORS
            })
        }

        const machineName = await getDeviceName(author)

        // check that the machine record exists,
        // and that the `seq` number is valid
        const machine = await this.sql`
            SELECT check_seq(${machineName}::VARCHAR, ${seq}::INT) AS is_valid
        `

        if (!machine[0].is_valid) {
            return new Response('Invalid signature', {
                status: 403,
                headers: Connection.CORS
            })
        }

        // the parent class reads the response code returned here
        this.oldMachine = { machineName, did: author }
        return new Response(null, { status: 200, headers: Connection.CORS })
    }

    async onJoin (msg:{ data: { did, humanName } }) {
        console.log('**join event**', msg)
        this.newMachine = msg.data
    }

    /**
     * The new machine has been verified by the original machine.
     */
    async onApprove (msg:string):Promise<this> {
        console.log('approved this machine', msg)
        const newMachine = this.newMachine
        const { humanName, did } = newMachine!
        const newMachineName = await getDeviceName(did)
        const oldMachine = this.oldMachine!

        // now update the DB
        await this.sql`
            INSERT INTO machine (
                machine_name,
                owner,
                did,
                seq,
                human_name
            ) VALUES (
                ${newMachineName},
                (SELECT owner FROM machine WHERE machine_name = ${oldMachine.machineName}),
                ${did},
                0,
                ${humanName}
            );
        `

        // const sql = `
        // INSERT INTO machine (
        //     machine_name,
        //     owner,
        //     did,
        //     seq,
        //     human_name
        // ) VALUES (
        //     '${machineName}',
        //     (SELECT email FROM usr WHERE usr.email = 'test@beef.com'),
        //     'did:key:zstring',
        //     0,
        //     'Phone'
        // );,
        // `
        // const client = new Client(getDbString(process.env))
        // await client.connect()
        // await client.query(sql)

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
