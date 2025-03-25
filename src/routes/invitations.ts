import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import type { State } from '../state.js'
import type { Invitation } from '../types.js'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import './invitations.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const InvitationRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    return html`<div class="route invitation">
        <h2>Your Invitations</h2>

        <${Conntent} invs=${state.myInvitations.value} />

        <hr />

        <form class="create-invitation">
            <div class="controls">
                <${BtnPrimary} type="submit">
                    Create an invitation
                <//>
            </div>
        </form>
    </div>`
}

function Conntent ({ invs }:{ invs:false|null|Invitation[] }) {
    if (invs === null) {
        return null
    }

    if (invs === false) {
        return html`<em>none</em>`
    }

    return html`<ul class="invitations">
        ${invs.map(inv => {
            return html`<li class="inv">
                <dl>
                    <dt>Code</dt>
                    <dd>${inv.code}</dd>

                    <dt>Note</dt>
                    <dd>${inv.note}</dd>

                    <dt>Created by</dt>
                    <dd>${inv.creator?.humanName || 'null'}</dd>
                </dl>
            </li>`
        })}
    </ul>`
}
