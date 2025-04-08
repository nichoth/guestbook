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
 * Route for requesting a login code via email.
 *
 * @TODO
 * Should deduplicate requests. Only create a new pending login record if
 * one does not already exist for the given email.
 */
export const LoginRoute:FunctionComponent<{
    state:ReturnType<typeof State>;
}> = function ({ state }) {
    const pendingEmail = useSignal<string>('')
    // false = failure
    // null = haven't made a request yet
    // true = success
    const loginRequest = useSignal<boolean|null>(null)
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
            loginRequest.value = true
        } catch (_err) {
            const err = _err as HTTPError
            debug('error', await err.response.text())
            debug(err)
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

            <div class="help-text">
                Send an email with a single-use login code.
            </div>

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

        ${loginRequest.value ?
            html`<div class="status success">
                <span>Success.</span> If that email exists,
                a message was sent to it.
            </div>` :
            null
        }
    </div>`
}
