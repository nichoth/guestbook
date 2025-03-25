import { type Signal, effect } from '@preact/signals'
import { customAlphabet } from '@nichoth/nanoid'
import { PARTYKIT_HOST } from '../party/client.js'
import { numbers } from '@nichoth/nanoid-dictionary'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Create a 6 digit numeric code.
 */
export const code = customAlphabet(numbers, 6)

export function getPartyUrl (code:string) {
    return PARTYKIT_HOST + `/parties/main/${code}`
}

/**
 * Execute the given function once, after the given signal is truthy.
 */
export function when (sig:Signal<any>, then:()=>Promise<any>) {
    debug('signal value', sig.value)
    if (!sig.value) return
    debug('down here.....')

    const dispose = effect(() => {
        if (!sig.value) return
        (async () => {
            await then()
            dispose()
        })()
    })
}
