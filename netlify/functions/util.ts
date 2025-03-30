import { getDeviceName } from '@bicycle-codes/keys'
import {
    parseHeader,
    verifyParsed,
    type ParsedHeader
} from '@bicycle-codes/request'
import type { HandlerEvent } from '@netlify/functions'

export function getDbString (env:NodeJS.ProcessEnv):string {
    let envVar:string|undefined = env[`NEON_URL_${process.env.NODE_ENV?.toUpperCase()}`]
    if (envVar) return envVar

    envVar = env['NEON_URL']
    if (!envVar) throw new Error('Not DB URL')

    return envVar
}

export function sanitizeHeader (seq:number, author:string) {
    try {
        return (author.length < 450 && seq < Number.MAX_SAFE_INTEGER)
    } catch (_err) {
        return false
    }
}

/**
 * Throw an error if the heaader is not valid. Return the machine
 * name, created by parsing the DID string in the header.
 *
 * @throws If the header is not valid
 * @returns The machine name, from the given DID.
 */
export async function verifyHeader (ev:HandlerEvent):Promise<[string, number]> {
    const headerString = ev.headers.authorization
    if (!headerString) {
        throw new Error('Need to authenticate.')
    }

    const parsedHeader:ParsedHeader = parseHeader(headerString)
    const { seq, author } = parsedHeader
    if (!sanitizeHeader(seq, author)) throw new Error('Bad header')
    const machineName = await getDeviceName(author)

    // check signature
    const isOk = await verifyParsed(parsedHeader)   // check signature
    if (!isOk) {
        throw new Error('Invalid signature')
    }

    return [machineName, seq]
}
