import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useCallback } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { State } from '../state.js'
import { NumberInput } from '../components/number-input.js'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import './invitations_create.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const CreateInvitationRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const uses = useSignal<number>(1)

    const create = useCallback(async function (ev:SubmitEvent) {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        const note = els['note'].value
        const uses = els['read-limit'].value

        await State.createInvitation(state, { note, uses })
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
                <${BtnPrimary} type="submit">Create<//>
            </div>
        </form>
    </div>`
}
