// import PartySocket from 'partysocket'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const PARTYKIT_HOST:string = (import.meta?.env?.MODE === 'development' ?
    'http://localhost:1999' :
    'https://guestbook.nichoth.partykit.dev')

// /**
//  * Get a websocket.
//  * @param roomName The room
//  * @param token A token, which is now obsolete
//  * @returns {PartySocket}
//  */
// export function Party (
//     roomName:string,
//     token?:string
// ):InstanceType<typeof PartySocket> {
//     const party = new PartySocket({
//         host: PARTYKIT_HOST,
//         room: roomName,
//         query: { token }
//     })

//     return party
// }
