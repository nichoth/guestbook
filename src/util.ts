import { customAlphabet } from '@nichoth/nanoid'
import { PARTYKIT_HOST } from '../party/client.js'
import { numbers } from '@nichoth/nanoid-dictionary'

/**
 * Create a 6 digit numeric code.
 */
export const code = customAlphabet(numbers, 6)

export function getPartyUrl (code:string) {
    return PARTYKIT_HOST + `/parties/main/${code}`
}
