import type * as Party from 'partykit/server'
import { Keys } from '@bicycle-codes/keys'
import { type AbortError, Client, fql } from 'fauna'
import {
    type ParsedHeader,
    parseHeader,
    verifyParsed
} from '@bicycle-codes/request'

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET',
    'Access-Control-Allow-Headers':
        'Origin, X-Requested-With, Content-Type, Accept, Authorization',
}

//
// __Room.id__
// Room ID defined in the Party URL, e.g. /parties/:name/:id.
//

// the existing device *does* have a keypair already in the DB
// can use that to create an Authorization header

const codeRegex = /^[0-9]{1,6}$/

/**
 * The websocket server does two things
 *   1. Accept connections from all machines. Use it as a presence indicator.
 *      We call this a "slug" route.
 *   2. Open a room with a 6 digit code as name. This is how we add a new device
 *      to the account. Call this a "code" route.
 */
export default class Server implements Party.Server {
    readonly room:Party.Room
    private note:null|false|string
    // a map from ws id to machine name
    private machines:Record<string, { name:string }>

    constructor (room:Party.Room) {
        this.room = room
        this.note = null
        this.machines = {}
    }

    /**
     * Return -- is this room name a 6 digit number?
     */
    get isSlugRoom ():boolean {
        return !codeRegex.test(this.room.id)
    }

    /**
     * If this is a room to add a device, then it has the idea of being "open".
     * The existing machine must do a POST to the room first to open it.
     */
    get isOpen ():boolean {
        return (this.note !== null)
    }

    /**
     * This is auth for existing machines, so you can connect and get the
     * presense indicator.
     *
     * `slug` here is the username or 6 digit code
     */
    static async onBeforeConnect (req:Party.Request, lobby:Party.Lobby) {
        const url = new URL(req.url)
        const token = req.headers.get('authorization')!
        const givenSlug = url.pathname.split('/').pop()
        if (!givenSlug) return new Response('Missing slug', { status: 400 })

        if ((codeRegex.test(givenSlug))) {  // 6 digit code
            // if this is the code route, not the slug route,
            // then don't do auth here
            return req
        }

        let header:ParsedHeader
        try {
            header = parseHeader<{ seq }>(token)
            if (!(await verifyParsed(header))) {
                // throw new Error('bad header signature')
                return new Response(null, { status: 403, headers: CORS })
            }
        } catch (err) {
            console.log('**header parse failed**', err)
            return new Response('Invalid header', {
                status: 403,
                headers: CORS
            })
        }

        const { env } = lobby
        // @TODO -- check the seq number
        const { _seq, author } = header
        const client = new Client({
            secret: env.FAUNA_SECRET as string
        })

        // signature is valid
        // now check that the machine is allowed for the user
        try {
            await client.query(fql`
                // get the machine by DID
                let machine = Machine.by_did(${author}).first()
                let user = machine.owner
                if (user?.username != ${givenSlug}) {
                    abort("Slug doesn't match")
                }
            `)
        } catch (_err) {
            const err = _err as AbortError
            if (err.abort?.toString().includes('Slug')) {
                console.log('***bad slug***', givenSlug)
                return new Response(null, { status: 403, headers: CORS })
            }

            console.log('**err**', err)
            return new Response(null, { status: 500, headers: CORS })
        }

        return req
    }

    /**
     * The existing device must make a POST request before the new machine
     * tries to connect. The POST request will have a signature that we verify.
     * Then the new machine connects. If this room has not been verified, then
     * the new machine is rejected.
     *
     * Each room has the concept of being "open" or "closed"
     * to open a room, you need to make a POST request
     * with a valid key + signature.
     */
    async onRequest (req:Party.Request):Promise<Response> {
        if (req.method === 'OPTIONS') {
            // respond to cors preflight requests
            return Response.json({ ok: true }, { status: 200, headers: CORS })
        }

        if (req.method === 'HEAD') {
            // this is the existing machine, checking if the room name
            // has been used yet. 200 means it is not in use.
            if (!this.isOpen) {
                return new Response(null, { status: 200, headers: CORS })
            } else {
                return new Response(null, { status: 409, headers: CORS })
            }
        }

        /**
         * The new device does a GET request, which returns
         * the note.
         */
        if (req.method === 'GET') {
            if (!this.isOpen) {
                return new Response(null, { status: 409, headers: CORS })
            }

            // is open
            // this is the new machine
            return Response.json({ note: this.note }, {
                status: 200,
                headers: CORS
            })
        }

        /**
         * First request is a POST, to open the room, for requests to
         * add a machine.
         */
        if (req.method === 'POST') {
            // check the signature of the request,
            // make sure it is valid for the DID &
            // is authorized for the given account slug
            if (this.isOpen) {
                // this should not happen
                // this means this is not the first connection
                // the new machine does not do POST calls
                return new Response(null, { status: 409, headers: CORS })
            }

            const secret = this.room.env.FAUNA_SECRET as string
            const client = new Client({ secret })

            // first connection
            // check the auth header, then open the room
            const token = req.headers.get('authorization') ?? ''
            if (!token) {
                return new Response('Missing auth header', {
                    status: 401,
                    headers: CORS
                })
            }

            let header:ParsedHeader
            try {
                header = parseHeader<{ seq }>(token)
                if (!(await verifyParsed(header))) {
                    throw new Error('bad header signature')
                }
            } catch (err) {
                console.log('**header parse failed**', err)
                return new Response('Invalid header', {
                    status: 403,
                    headers: CORS
                })
            }

            const url = new URL(req.url)
            const givenSlug = url.pathname.split('/').pop()
            if (!givenSlug) {
                return new Response('Not slug', {
                    status: 400,
                    headers: CORS
                })
            }

            const { seq, author } = header
            // author is the user's machine
            // need to make sure the given machine is related to a user
            try {
                await client.query(fql`
                    // get the machine by DID
                    let machine = Machine.by_did(${author}).first()
                    if (machine == null) {
                        abort('Invalid machine')
                    }
                    if (machine.seq >= ${seq}) {
                        abort('Invalid sequence number')
                    }
                    let user = machine.owner
                    if (user?.username != ${givenSlug}) {
                        abort("Slug doesn't match")
                    }
                `)
            } catch (_err) {
                const err = _err as AbortError
                if (err.code === 'abort') {
                    if (
                        typeof err.abort === 'string' &&
                        err.abort.includes('sequence number')
                    ) {
                        return new Response('Invalid sequence', {
                            status: 403,
                            headers: CORS
                        })
                    }
                    return new Response(null, { status: 403, headers: CORS })
                }
            }

            let msg:{ note:string }
            try {
                msg = await req.json<{ note:string }>()
            } catch (err) {
                console.log('**err parsing**', err)
                return new Response(null, { status: 422, headers: CORS })
            }

            // now "open" the room
            this.note = msg.note || false

            return new Response(null, { status: 200, headers: CORS })
        }

        return new Response(null, { status: 405, headers: CORS })
    }

    // update our connection state
    onClose (conn:Party.Connection) {
        const { id } = conn
        delete this.machines[id]
        this.room.broadcast(JSON.stringify({
            connections: Object.values(this.machines)
        }))
    }

    /**
     * Need to do a POST call to this room to "open" it before WS connection.
     */
    async onConnect (conn:Party.Connection) {
        // we handle auth for the slug room in `onBeforeConnect` static method
        if (this.isSlugRoom) {
            // add to our list of machines
            const { author } = await parseToken(conn.uri)
            const name = await Keys.deviceName(author)
            const newState = {}
            newState[conn.id] = name
            this.machines = {
                ...this.machines,
                ...newState
            }

            // notify all the other connections
            return this.room.broadcast(JSON.stringify({
                connections: Object.values(this.machines)
            }))
        }

        // else, is "code" room
        if (!this.isOpen) {
            // must call with a POST request to "open" the room, handle auth
            return conn.close(1002, 'Room is not open')
        }
    }

    async onMessage (message:string, sender:Party.Connection) {
        // should not happen
        if (!this.isOpen) throw new Error('Not open')

        console.log('**got a message**', message)

        this.room.broadcast(message, [sender.id])
    }
}

Server satisfies Party.Worker

/**
 * Take the request URL, parse the token, which is
 * passed in as a query parameter.
 */
async function parseToken<T=any> (uri:string):Promise<ParsedHeader<T>> {
    const url = new URL(uri)
    const token = url.searchParams.get('token')!
    if (!token) {
        throw new Error('not token')
    }

    let header:ParsedHeader<T>
    try {
        header = parseHeader<T>(token)
        if (!(await verifyParsed(header))) {
            throw new Error('bad header signature')
        }
    } catch (err) {
        console.log('**header parse failed**', err)
        throw new Error('Invalid header')
    }

    const isOk = await verifyParsed(header)
    if (!isOk) throw new Error('Invalid signature')

    return header
}
