import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { useComputed, useSignal } from '@preact/signals'
import { State } from '../state.js'
import './link.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Route for if you lost your keys.
 */
export const LostRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const pendingEmail = useSignal<string>('')
    const isEmailValid = useComputed<boolean>(() => {
        const split = pendingEmail.value.split('@').filter(Boolean)
        const [, tld] = pendingEmail.value.split('.').filter(Boolean)
        if (split.length !== 2) return false
        if (!tld || !tld.length) return false
        if (pendingEmail.value.split(' ').filter(Boolean).length > 1) {
            return false
        }
        return true
    })
    const isResolving = useSignal<boolean>(false)

    const submit = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        const email = (ev.target as HTMLFormElement).elements['email'].value
        isResolving.value = true
        try {
            await State.forgot(state, email)
        } catch (err) {
            debug('error', err)
        }
        isResolving.value = false
    }, [])

    const input = useCallback((ev:InputEvent) => {
        const email = (ev.target as HTMLInputElement).value
        pendingEmail.value = email
    }, [])

    return html`<div class="route lost">
        <p>
            If there is an account with this email, we will send a message
            to the address with the ability to reset your keys.
        </p>
        <form onSubmit=${submit}>
            <${TextInput}
                onInput=${input}
                displayName="Email"
                name="email"
            />

            <div class="controls">
                <${BtnPrimary}
                    type="submit"
                    disabled=${!isEmailValid.value}
                    isSpinning=${isResolving.value}
                >
                    Reset my keys
                <//>
            </div>
        </form>
    </div>`
}
