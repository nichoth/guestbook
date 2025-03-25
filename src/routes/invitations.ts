import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import type { State } from '../state.js'
import type { Invitation } from '../types.js'
import {
    LinkButtonPrimary as LinkPrimary
} from '../components/button-outline.js'
import './invitations.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const InvitationRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    return html`<div class="route invitations">
        <h2>Your Invitations</h2>

        <${Conntent} invs=${state.myInvitations.value} />

        <hr />

        <div class="controls">
            <${LinkPrimary} href="/invitations/create">
                Create an invitation
            <//>
        </div>
    </div>`
}

function Conntent ({ invs }:{ invs:false|null|Invitation[] }) {
    if (invs === null) {
        return html`<div class="content"></div>`
    }

    if (invs === false) {
        return html`<div class="content"><em>none</em></div>`
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
