import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { ELLIPSIS } from '@substrate-system/util/constants'
import { TextInput } from '@nichoth/components/htm/text-input'
import { type FunctionComponent } from 'preact'
import { useSignal } from '@preact/signals'
import {
    type StatusSignal,
    ConnectionStatus
} from '../components/connection-status.js'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import { State } from '../state/index.js'
import '@nichoth/components/text-input.css'
import './link-new-device.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * The new device visits this route to add itself to an existing account.
 */
export const LinkNewDeviceRoute:FunctionComponent<{
    state:ReturnType<typeof State>;
    params:{ code:string }
}> = function ({ state, params }) {
    const pendingName = useSignal<string>('')
    const statusSignal:StatusSignal = useSignal('waiting')
    const oldMachine = useSignal<string|null>(null)
    const oldMachineNote = useSignal<string|null>(null)
    const loading = useSignal<boolean>(false)

    const joinRoom = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        const { code } = params
        const els = (ev.target as HTMLFormElement).elements
        const ws = await State.newMachineConnect(
            state,
            code,
            {
                note: els['new-device-note'].value,
                newMachineName: els['new-device-name'].value
            }
        )

        statusSignal.value = 'connected'

        ws.addEventListener('note', ev => {
            debug('got the note in new machine', ev.detail)
            oldMachineNote.value = ev.detail.note
            oldMachine.value = ev.detail.data.oldMachineName
        })

        ws.addEventListener('approve', async ev => {
            debug('got the approve event', ev.detail)
            statusSignal.value = 'approved'
            loading.value = true
            await State.newDeviceApproved(state)
            loading.value = false
        })

        ws.addEventListener('reject', ev => {
            debug('rejected...', ev.detail)
        })
    }, [])

    const handleInput = useCallback((ev:InputEvent) => {
        const input = ev.target as HTMLInputElement
        pendingName.value = input.value
    }, [])

    const classes = (['route', 'link-new-device',
        loading.value ? 'loading' : null]).filter(Boolean).join(' ')

    return html`<div class="${classes}">
        <h2>Add a device</h2>

        <${ConnectionStatus}
            linkStatus=${statusSignal}
            displayName=${oldMachine.value}
        />

        <form class="new-device-data" onSubmit=${joinRoom}>
            <${TextInput}
                onInput=${handleInput}
                value=${pendingName.value}
                name="new-device-name"
                displayName="Device name"
            />

            <label for="new-device-note">
                This note will be visible to your existing device.
            </label>
            <textarea
                name="new-device-note"
                id="new-device-note"
                placeholder="This is my note${ELLIPSIS}"
            >
          </textarea>

          <div class="controls">
                <${BtnPrimary}
                    type="submit"
                    disabled=${(
                        !(pendingName.value) ||
                        (
                            statusSignal.value === 'connected' ||
                            statusSignal.value === 'approved'
                        ))}
                >
                    Connect
                <//>
            </div>
        </form>
    </div>`
}
