import { html } from 'htm/preact'
import { useSignal } from '@preact/signals'
import { TextInput } from '@nichoth/components/htm/text-input'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import { useCallback } from 'preact/hooks'
import { type HTTPError } from 'ky'
import { type FunctionComponent } from 'preact'
import { State } from '../state/index.js'
import './login.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * When you are on a new machine, redeeming a login code.
 */
export const LoginAccept:FunctionComponent<{
    state:ReturnType<typeof State>
    params:{ code:string }
}> = function ({ state, params }) {
    const machineName = useSignal<string>('Temporary machine')
    const errorText = useSignal<string|null>(null)
    const isResolving = useSignal<boolean>(false)

    const handleInput = useCallback((ev:InputEvent) => {
        const el = ev.target as HTMLInputElement
        machineName.value = el.value
    }, [])

    const login = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        debug('logging in', ev)
        const { code } = params
        const els = (ev.target as HTMLFormElement).elements
        const name = els['machine-name']
        const machineHumanName = name.value
        isResolving.value = true
        try {
            await State.loginWithToken(state, code, machineHumanName)
        } catch (_err) {
            const err = _err as HTTPError
            if (err.response.status === 403) {
                // bad code
                errorText.value = await err.response.text()
            }
            debug('caugh an error...', await err.response.text())
        } finally {
            isResolving.value = false
        }
    }, [])

    return html`<div class="route login-accept">
        <p>
            Login with a single-use code.
        </p>

        <form onSubmit=${login}>
            ${errorText.value ?
                html`<div class="error">
                    ${errorText.value}
                </div>` :
                null
            }

            <${TextInput}
                onInput=${handleInput}
                displayName="New machine name"
                value=${machineName.value}
                name="machine-name"
            />

            <${BtnPrimary}
                type="submit"
                disabled=${!machineName.value}
                isSpinning=${isResolving}
            >
                Login
            <//>
        </form>
    </div>`
}
