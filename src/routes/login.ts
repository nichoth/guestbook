import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import { useCallback } from 'preact/hooks'
import { useSignal, useComputed } from '@preact/signals'
import { type HTTPError } from 'ky'
import { type FunctionComponent } from 'preact'
import { State } from '../state/index.js'
import './login.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Route for if you lost your keys.
 */
export const LoginRoute:FunctionComponent<{
    state:ReturnType<typeof State>;
}> = function ({ state }) {
    const pendingEmail = useSignal<string>('')
    const isResolving = useSignal<boolean>(false)
    const isEmailValid = useComputed<boolean>(() => {
        const split = pendingEmail.value.split('@').filter(Boolean)
        if (!(split.length >= 2)) return false
        const segments = pendingEmail.value.split('.').filter(Boolean)
        const tld = segments[segments.length - 1]
        if (!(segments.length >= 2)) return false
        if (!tld || !tld.length) return false
        if (pendingEmail.value.split(' ').filter(Boolean).length > 1) {
            return false
        }
        return true
    })

    const handleInput = useCallback((ev:InputEvent) => {
        const email = (ev.target as HTMLInputElement).value
        pendingEmail.value = email
    }, [])

    const submit = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        isResolving.value = true
        try {
            await State.LoginToken(state, pendingEmail.value)
        } catch (_err) {
            const err = _err as HTTPError
            debug('error', await err.response.text())
        }
        isResolving.value = false
    }, [])

    return html`<div class="route login">
        <form onSubmit=${submit}>
            <${TextInput}
                onInput=${handleInput}
                displayName="Email"
                name="email"
            />

            <div class="controls">
                <${BtnPrimary}
                    type="submit"
                    disabled=${!isEmailValid.value}
                    isSpinning=${isResolving}
                >
                    Request a login code
                <//>
            </div>
        </form>
    </div>`
}
