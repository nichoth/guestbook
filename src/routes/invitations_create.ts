import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useCallback } from 'preact/hooks'
import { State } from '../state.js'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import './invitations_create.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const CreateInvitationRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const create = useCallback(async function (ev:SubmitEvent) {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        const note = els['note'].value

        debug('create a new invitation', els)

        await State.createInvitation(state, { note })
    }, [])

    return html`<div class="route invitations create">
        <h2>
            Create a new invitation
        </h2>

        <form onSubmit=${create} class="create-invitation">
            <textarea placeholder="notes here..." name="note" class="note"></textarea>

            <div class="help-text">
                This note will be visible by anyone who redeems this invitation.
            </div>

            <div class="controls">
                <${BtnPrimary} type="submit">Create<//>
            </div>
        </form>
    </div>`
}
