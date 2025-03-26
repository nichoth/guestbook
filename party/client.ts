export const PARTYKIT_HOST:string = (import.meta?.env?.MODE === 'development' ?
    'http://localhost:1999' :
    'https://guestbook.nichoth.partykit.dev')
