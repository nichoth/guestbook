import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useCallback } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import type { HTTPError } from 'ky'
import { State } from '../state.js'
import { NumberInput } from '../components/number-input.js'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import './invitations_create.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const CreateInvitationRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const uses = useSignal<number>(1)
    const isResolving = useSignal<boolean>(false)

    const create = useCallback(async function (ev:SubmitEvent) {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        const note = els['note'].value
        const uses = els['read-limit'].value

        isResolving.value = true
        try {
            await State.createInvitation(state, { note, uses })
            State.toast(state, 'success', 'Invitation created.')
        } catch (_err) {
            const err = _err as HTTPError
            const res = await err.response.text()
            debug('error creating invitation', res)
            debug('err', err)
            State.toast(state, 'error', res)
        }
        isResolving.value = false
    }, [])

    return html`<div class="route invitations create">
        <h2>
            Create a new invitation
        </h2>

        <form onSubmit=${create} class="create-invitation">
            <textarea id="note" placeholder="notes here..." name="note" class="note"></textarea>

            <label for="note" class="help-text">
                This note will be visible to anyone who redeems this invitation.
            </label>

            <${NumberInput}
                id="read-limit"
                title="Set the number of uses for this invitation"
                class="invitation-uses"
                min=${1}
                value=${uses}
                max=${100}
                name="read-limit"
            />
            <div class="help-text">
                Number of uses
            </div>

            <div class="controls">
                <${BtnPrimary}
                    type="submit"
                    isSpinning=${isResolving}
                >Create<//>
            </div>
        </form>
    </div>`
}
