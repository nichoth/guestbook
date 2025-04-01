import { html } from 'htm/preact'
import { type Signal, useComputed } from '@preact/signals'
import { Dot } from './dot.js'
import './connection-status.css'
import Debug from '@substrate-system/debug'
import { ELLIPSIS, BULLET } from '@substrate-system/util/constants'
const debug = Debug()

export type StatusSignal = Signal<null|'waiting'|'connected'|'approved'>

export function ConnectionStatus ({
    linkStatus,
    displayName
}:{
    linkStatus:StatusSignal;
    displayName:string;
}) {
    const color = useComputed(() => {
        if (!linkStatus.value) {
            return 'gray'
        }
        if (linkStatus.value === 'waiting') {
            return 'gray'
        }
        if (linkStatus.value === 'connected') {
            return 'yellow'
        }
        if (linkStatus.value === 'approved') {
            return 'green'
        }
    })

    debug('status', linkStatus.value)

    return html`<div class="connection-status">
        <${Dot} color=${color.value} />
        <span>${displayName}</span>
        <span class="status">
            ${linkStatus.value === 'waiting' ?
                'waiting' + ELLIPSIS :
                `${BULLET} ` + linkStatus.value
            }
        </span>
    </div>
    `
}
