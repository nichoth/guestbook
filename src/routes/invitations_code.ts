import { html } from 'htm/preact'
import { useCallback, useRef } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { useComputed } from '@preact/signals'
import { type HTTPError } from 'ky'
import { DateTime } from 'luxon'
import { clipboardCopy } from '@substrate-system/copy-button/copy'
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js'
import type { SlTooltip } from '@shoelace-style/shoelace'
import type { Invitation } from '../types.js'
import { State } from '../state/index.js'
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

    const copiedUrl = useRef<SlTooltip>(null)
    const copiedCode = useRef<SlTooltip>(null)

    const invitationUrl = useComputed(() => {
        if (!invitation.value) return null
        return `${location.origin}/accept/${invitation.value.code}`
    })

    const ts = useComputed<null|string>(() => {
        if (!invitation.value) return null
        return DateTime
            .fromISO(invitation.value.ts)
            .toLocaleString(DateTime.DATETIME_MED)
    })

    const copyCode = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        clipboardCopy(invitation.value!.code)
        setTimeout(() => {
            copiedCode.current?.hide()
        }, 2000)
    }, [copiedCode.current])

    const copyUrl = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        clipboardCopy(invitationUrl.value!)
        setTimeout(() => {
            copiedUrl.current?.hide()
        }, 2000)
    }, [copiedUrl.current])

    const deleteInvitation = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        try {
            await State.deleteInvitation(state, params.code)
            State.toast(state, 'success', 'Invitation deleted.')
            state._setRoute('/invitations')
        } catch (_err) {
            debug('error...', _err)
            const err = _err as HTTPError
            State.toast(state, 'error', await err.response.text())
        }
    }, [])

    if (!invitation.value) return null

    return html`<div class="route invitation-by-code">
        <div class="invitation">
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
                <span>
                    <sl-tooltip ref=${copiedCode} content="Copied code!" trigger="click">
                        <${Btn} onClick=${copyCode}>Copy invitation code<//>
                    </sl-tooltip>
                </span>
                <span>
                    <sl-tooltip ref=${copiedUrl} content="Copied URL!" trigger="click">
                        <${Btn} onClick=${copyUrl}>Copy invitation URL<//>
                    </sl-tooltip>
                </span>
                <span>
                    <${BtnDanger} onClick=${deleteInvitation}>Delete<//>
                </span>
            </div>
        </div>
    </div>`
}
