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
    state:ReturnType<typeof State>
}> = function ({ state }) {
    debug('login route', state)
    const pendingEmail = useSignal<string>('')
    const pendingMachineName = useSignal<string>('')
    const isResolving = useSignal<boolean>(false)
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

    const handleInput = useCallback((ev:InputEvent) => {
        const email = (ev.target as HTMLInputElement).value
        pendingEmail.value = email
    }, [])

    const editMachineName = useCallback((ev:InputEvent) => {
        pendingMachineName.value = (ev.target as HTMLInputElement).value
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

    const isValid = useComputed<boolean>(() => {
        return (
            isEmailValid.value &&
            !!(pendingMachineName.value) &&
            !isResolving.value
        )
    })

    return html`<div class="route login">
        <form onSubmit=${submit}>
            <${TextInput}
                onInput=${handleInput}
                displayName="Email"
                name="email"
            />

            <${TextInput}
                onInput=${editMachineName}
                name="machine-name"
                displayName="Machine name"
            />

            <div class="controls">
                <${BtnPrimary}
                    type="submit"
                    disabled=${!isValid.value}
                    isSpinning=${isResolving.value}
                >
                    Request a login code
                <//>
            </div>
        </form>
    </div>`
}
