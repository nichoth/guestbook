import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useComputed } from '@preact/signals'
import type { State } from '../state.js'
import type { Invitation } from '../types.js'
import './invitations_code.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const InvitationByCode:FunctionComponent<{
    state:ReturnType<typeof State>,
    params:{ code:string }
}> = function ({ state, params }) {
    const invitation = useComputed<undefined|Invitation>(() => {
        return (state.myInvitations.value || []).find(inv => {
            return inv.code === params.code
        })
    })

    return html`<div class="route invitation-by-code">
        ${invitation.value ?
            html`<div class="invitation">
                <dl>
                    <dt>code</dt>
                    <dd>${invitation.value.code}</dd>
                </dl>
            </div>` :
            null
        }
    </div>`
}
