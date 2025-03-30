import '@substrate-system/a11y'
import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { State } from '../state.js'
import type { Invitation } from '../types.js'
import { register } from '@substrate-system/copy-button'
import '@substrate-system/copy-button/css'
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js'
import {
    LinkButtonPrimary as LinkPrimary
} from '../components/button-outline.js'
import { IconX } from '../components/icon-close-x.js'
import './invitations.css'
import { type HTTPError } from 'ky'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

if (!window.customElements.get('copy-button')) {
    register()
}

export const InvitationRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const deleteInvitation = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        const data = (ev.currentTarget as HTMLButtonElement).dataset
        const code = data['code']

        try {
            await State.deleteInvitation(state, code!)
            State.toast(state, 'success', 'Invitation deleted')
        } catch (_err) {
            const err = _err as HTTPError
            State.toast(state, 'error', await err.response.text())
        }
    }, [])

    return html`<div class="route invitations">
        <h2>Your Invitations</h2>

        <p>
            Invitations that you have created.
        </p>

        <${Conntent}
            invs=${state.myInvitations.value}
            onDelete=${deleteInvitation}
        />

        <hr />

        <div class="controls">
            <${LinkPrimary} href="/invitations/create">
                Create a new invitation
            <//>
        </div>
    </div>`
}

function Conntent ({ invs, onDelete }:{
    invs:false|null|Invitation[];
    onDelete:(ev:MouseEvent)=>any;
}) {
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
                    <span class="label">code:</span>
                    <a href="/invitations/${inv.code}">
                        ${inv.code}
                    </a>
                </div>

                <div class="invitation-field">
                    <span class="label">Remaining uses:</span>
                    <span>${inv.remaining}</span>
                </div>

                <div class="invitation-field">
                    <sl-tooltip content="Delete this invitation">
                        <${IconX} data-code=${inv.code} onClick=${onDelete} />
                    </sl-tooltip>
                </div>
            </li>`
        })}
    </ul>`
}
