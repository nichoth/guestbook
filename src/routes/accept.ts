// import { TextInput } from '@nichoth/components/htm/text-input'
import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { State } from '../state.js'
import { TextInput } from '@nichoth/components/htm/text-input'
import './link.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Accept invitation route.
 *   - check with the server if the invitation is valid.
 *   - if we are passed a parameter, then call to redeem
 *     else, show a text input for the invitation code
 */
export const AcceptRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    debug('link route', state)

    const redeemInvitation = useCallback((ev:SubmitEvent) => {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        State.acceptInvitation(state, els['invcode'].value)
    }, [])

    return html`<div class="route add">
        <form onSuvmit=${redeemInvitation}>
            <${TextInput}
                name="invcode"
                displayName="Invitation code"
            />
        </form>
    </div>`
}
