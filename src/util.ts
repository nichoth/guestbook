import { type Signal, effect } from '@preact/signals'
import { customAlphabet } from '@nichoth/nanoid'
import { numbers } from '@nichoth/nanoid-dictionary'
import { PARTYKIT_HOST } from './state.js'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

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
export function when<T> (
    sig:Signal<null|false|any>,
    then:()=>Promise<T>
):Promise<T> {
    return new Promise((resolve, reject) => {
        if (sig.value === null) return

        const dispose = effect(() => {
            if (sig.value === null) return
            (async () => {
                try {
                    const res = await then()
                    dispose()
                    resolve(res)
                } catch (err) {
                    reject(err)
                }
            })()
        })
    })
}
