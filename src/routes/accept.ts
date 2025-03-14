// import { TextInput } from '@nichoth/components/htm/text-input'
import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { State } from '../state.js'
import { TextInput } from '@nichoth/components/htm/text-input'
import { useSignal } from '@preact/signals'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import './link.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

/**
 * Accept invitation route.
 *   - check with the server if the invitation is valid.
 *   - if we are passed a parameter, then call to redeem
 *     else, show a text input for the invitation code
 */
export const AcceptRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const isInvitationValid = useSignal<boolean>(false)

    const redeemInvitation = useCallback((ev:SubmitEvent) => {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        State.acceptInvitation(state, els['invcode'].value)
    }, [])

    const handleInput = useCallback((ev:InputEvent) => {
        const value = (ev.target as HTMLInputElement).value
        if (value.trim().length) {
            isInvitationValid.value = true
        } else {
            isInvitationValid.value = false
        }
    }, [])

    return html`<div class="route add">
        <form onSubmit=${redeemInvitation}>
            <${TextInput}
                onInput=${handleInput}
                name="invcode"
                displayName="Invitation code"
            />

            <div class="controls">
                <${BtnPrimary}
                    type="submit"
                    disabled=${!isInvitationValid.value}
                >
                    Accept Invitation
                <//>
            </div>
        </form>
    </div>`
}
