import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useCallback } from 'preact/hooks'
import { State } from '../state.js'
import type { Invitation } from '../types.js'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import './invitations.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const InvitationRoute:FunctionComponent<{
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
        <form onSubmit=${create} class="create-invitation">

            <${BtnPrimary} type="submit">Create<//>
        </form>
    </div>`
}
