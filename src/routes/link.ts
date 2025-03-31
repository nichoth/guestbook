import { html } from 'htm/preact'
import { useCallback, useRef } from 'preact/hooks'
import { ELLIPSIS, NBSP } from '@substrate-system/util/constants'
import { type FunctionComponent } from 'preact'
import { clipboardCopy } from '@substrate-system/copy-button/copy'
import type { SlTooltip } from '@shoelace-style/shoelace'
import { useComputed, useSignal, batch, type Signal } from '@preact/signals'
import { type DID } from '@bicycle-codes/keys'
import { register } from '@substrate-system/copy-button'
import { Dot } from '../components/dot.js'
import { Btn, Primary as BtnPrimary } from '../components/button-outline.js'
import { State } from '../state.js'
import './link.css'
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js'
import '@substrate-system/copy-button/css'
import Debug from '@substrate-system/debug'
import { type Connection } from '@hello-system/connect'
const debug = Debug()

if (!window.customElements.get('copy-button')) {
    register()
}

type StatusSignal = Signal<null|'waiting'|'connected'|'approved'>
type NewMachineSignal = Signal<null|{ note:string, DID:DID, name:string }>

export const LinkRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const roomName = useSignal<string|null>(null)
    const linkStatus:StatusSignal = useSignal(null)
    const connection = useSignal<Connection|null>(null)
    const roomUrl = useComputed(() => {
        if (!roomName.value) return null
        return `${location.href}/${roomName.value}`
    })
    const newMachine:NewMachineSignal = useSignal(null)

    const initLink = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        debug('init')
        linkStatus.value = 'waiting'
        const [code, ws] = await State.initAddDevice(
            state,
            'Hello from the old machine.'
        )

        connection.value = ws

        // listen for events
        ws.addEventListener('join', ev => {
            const detail = ev.detail
            debug('join event in old machine', detail)
            batch(() => {
                newMachine.value = {
                    note: detail.note,
                    name: detail.data.newMachineName,
                    DID: detail.data.DID
                }
                linkStatus.value = 'connected'
            })

            // example event detail
            // {
            //     "note": "hello old machine",
            //     "data": {
            //         "newMachineName": "abc123"
            //         "did": "did:key:z13V3Sog2YaUKhdGCmgx9UZuW1o1ShFJYc6DvGYe7NTt689NoL3HTngsYXyRiB2tVXnrDt2KNLaniQZwLGJUx962m3ZP4wxUEAxHkNHqcmhiFp1vFbGnkp8TcNpyjb84cZzgCabEwQLXsT3fn8EchfgknWFxS715BQyQLDgrYPBh6KU67sdfx7yKeAUi4pfEpbpYdy2X8j6F1NiaNSQniWqX9fUDjhMTAa4gHauW3wfn65FxjZLpefZS4o5Qi6GUVLzrEH71xkGnStXGtaLt6HXLiutDAdA7V4P1VhofvL8mv9qMgGvwTzWGTQamw5YL52g1bTbDeqKtyGbTPSsvypQcYx5KEqbdHtihmdgZ88jZRa8EZsXuA2grfbuc31w9p1LkjdHbpZ3zvpUd87TXEwa"
            //     }
            // }
        })

        roomName.value = code
    }, [])

    const approveNewMachine = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        debug('approved')
        connection.value?.approve()
    }, [])

    return html`<div class="route link">
        <h2>Add a device to your account</h2>
        <p>
            The same person ${ELLIPSIS} Multiple machines ${ELLIPSIS}${NBSP}
            No passwords ${ELLIPSIS}
        </p>

        ${!roomName.value ?
            html`<p>
                This will generate a unique URL that you need to visit on the
                new machine.
            </p>` :
            null
        }

        <div class="add-device-info">
            ${roomName.value ?
                html`<div class="ws-info">
                    The new device should visit this url:
                </div>
                <div class="url">
                    <code>${roomUrl.value}</code>
                    <span>
                        <copy-button payload="${roomUrl.value}"></copy-button>
                    </span>
                </div>

                <${ConnectionStatus}
                    linkStatus=${linkStatus}
                    displayName=${linkStatus.value === 'waiting' ?
                        'waiting' + ELLIPSIS :
                        newMachine.value!.name
                    }
                />` :
                null
            }
            
            <${Controls}
                newMachine=${newMachine}
                roomName=${roomName}
                onInit=${initLink}
                roomUrl=${roomUrl}
                status=${linkStatus}
                onApprove=${approveNewMachine}
            />
        </div>
    </div>`
}

function Controls ({
    roomName,
    onInit,
    roomUrl,
    status,
    onApprove
}:{
    newMachine:NewMachineSignal;
    roomName:Signal<string|null>;
    onInit:(ev:MouseEvent)=>any;
    onApprove:(ev:MouseEvent)=>any;
    roomUrl:Signal<string|null>;
    status:StatusSignal;
}) {
    const copiedUrl = useRef<SlTooltip>(null)
    const copyUrl = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        clipboardCopy(roomUrl.value!)
        setTimeout(() => {
            copiedUrl.current?.hide()
        }, 2000)
    }, [copiedUrl.current])

    // prompt for creating a room
    if (!roomName.value) {
        debug('in here')
        return html`<div class="controls">
            <${BtnPrimary}
                onClick=${onInit}
                disabled=${!!roomName.value}
            >
                Add a device
            <//>
        </div>`
    }

    // prompt for connecting the other machine
    if (status.value === 'waiting') {
        return html`<div class="controls">
            <sl-tooltip
                ref=${copiedUrl}
                content="Copied!"
                trigger="click"
            >
                <${Btn} class="copy-btn" onClick=${copyUrl}>
                    Copy URL
                <//>
            </sl-tooltip>
        </div>`
    }

    // prompt for approval
    return html`
        <div class="controls">
            <${BtnPrimary}
                onClick=${onApprove}
            >
                Approve this device
            <//>
        </div>
    `
}

function ConnectionStatus ({
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

    return html`<div class="connection-status">
        <${Dot} color=${color.value} />
        <span>${displayName}</span>
    </div>
    `
}
