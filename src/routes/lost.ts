import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { useSignal } from '@preact/signals'
import { State } from '../state.js'
import './link.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const LostRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    debug('link route', state)

    const isOk = useSignal<boolean>(false)
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
        if (isOk.value !== !!email) isOk.value = !!email
    }, [])

    return html`<div class="route lost">
        <form onSubmit=${submit}>
            <${TextInput}
                onInput=${input}
                displayName="Email"
                name="email"
            />

            <${BtnPrimary}
                type="submit"
                isSpinning=${isResolving.value}
            >
                Reset my keys
            <//>
        </form>
    </div>`
}
