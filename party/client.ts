import ky from 'ky'
import PartySocket from 'partysocket'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const PARTYKIT_HOST:string = (import.meta?.env?.MODE === 'development' ?
    'http://localhost:1999' :
    'https://guestbook.nichoth.partykit.dev')

/**
 * Get a websocket.
 * @param roomName The room
 * @param token A token, which is now obsolete
 * @returns {PartySocket}
 */
export function Party (
    roomName:string,
    token?:string
):InstanceType<typeof PartySocket> {
    const party = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomName,
        query: { token }
    })

    return party
}

Party.withAuth = function (roomName:string, token:string):PartySocket {
    return Party(roomName, token)
}

export async function fetchAuthData (roomId:string):Promise<{
    key:string,
    note:string
}> {
    const res = await ky.get(`${PARTYKIT_HOST}/parties/main/${roomId}`)
        .json<{ key:string, note:string }>()

    return res
}
