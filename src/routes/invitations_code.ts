import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { useComputed } from '@preact/signals'
import { DateTime } from 'luxon'
import type { State } from '../state.js'
import type { Invitation } from '../types.js'
import { Btn, Danger as BtnDanger } from '../components/button-outline.js'
import './invitations_code.css'
import '../components/dl.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const InvitationByCode:FunctionComponent<{
    state:ReturnType<typeof State>,
    params:{ code:string }
}> = function ({ state, params }) {
    const invitation = useComputed<undefined|Invitation>(() => {
        return (state.myInvitations.value || []).find(inv => {
            return inv.code === params.code
        })
    })

    const ts = useComputed<null|string>(() => {
        if (!invitation.value) return null
        return DateTime
            .fromISO(invitation.value.ts)
            .toLocaleString(DateTime.DATETIME_MED)
    })

    const copyCode = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
    }, [])

    const copyUrl = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
    }, [])

    const deleteInvitation = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        debug('click delete')
    }, [])

    return html`<div class="route invitation-by-code">
        ${invitation.value ?
            html`<div class="invitation">
                <h2>Invitation</h2>

                <dl>
                    <dt>code</dt>
                    <dd><code>${invitation.value.code}</code></dd>

                    <dt>Created at</dt>
                    <dd>${ts.value}</dd>

                    <dt>Note</dt>
                    <dd>${invitation.value.note || html`<em>none</em>`}</dd>

                    <div class="uses">
                        <dt class="uses">Remaining uses</dt>
                        <dd class="uses">
                            ${invitation.value.remaining}
                        </dd>
                        <span class="initial">
                            / ${invitation.value.initial}
                        </span>
                    </div>
                </dl>

                <div class="controls">
                    <${Btn} onClick=${copyCode}>Copy invitation code<//>
                    <${Btn} onClick=${copyUrl}>Copy invitation URL<//>
                    <${BtnDanger} onClick=${deleteInvitation}>Delete<//>
                </div>
            </div>` :
            null
        }
    </div>`
}
