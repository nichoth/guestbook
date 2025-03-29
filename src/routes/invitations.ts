import '@substrate-system/a11y'
import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import type { State } from '../state.js'
import type { Invitation } from '../types.js'
import { register } from '@substrate-system/copy-button'
import '@substrate-system/copy-button/css'
import {
    LinkButtonPrimary as LinkPrimary
} from '../components/button-outline.js'
import './invitations.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()
register()

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
        return html`<div class="content none">
            <em>none</em>
        </div>`
    }

    return html`<ul class="invitations">
        ${invs.map(inv => {
            return html`<li class="inv">
                <div class="invitation-field">
                    <span><copy-button payload="${inv.code}"></copy-button></span>
                    <span class="label">code</span>
                    <span>${inv.code}</span>
                </div>
                <div class="invitation-field">
                    <span class="label">Remaining uses</span>
                    <span>${inv.remaining}</span>
                </div>
            </li>`
        })}
    </ul>`
}
