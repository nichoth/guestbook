import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { ELLIPSIS, NBSP } from '@substrate-system/util/constants'
import { type FunctionComponent } from 'preact'
import { clipboardCopy } from '@substrate-system/copy-button/copy'
import { useComputed, useSignal } from '@preact/signals'
import { register } from '@substrate-system/copy-button'
import { Btn, Primary as BtnPrimary } from '../components/button-outline.js'
import { State } from '../state.js'
import './link.css'
import '@substrate-system/copy-button/css'
import Debug from '@substrate-system/debug'
const debug = Debug()

if (!window.customElements.get('copy-button')) {
    register()
}

export const LinkRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    debug('link route', state)
    const roomName = useSignal<string|null>(null)
    const roomUrl = useComputed(() => {
        if (!roomName.value) return null
        return `${location.href}/${roomName.value}`
    })

    const initLink = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        debug('init')
        const code = await State.initAddDevice(state, 'hello websockets')
        roomName.value = code
    }, [])

    const copyUrl = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        clipboardCopy(roomUrl.value!)
    }, [])

    return html`<div class="route link">
        <h2>Add a device to your account</h2>
        <p>
            The same person ${ELLIPSIS} Multiple machines ${ELLIPSIS}${NBSP}
            No passwords ${ELLIPSIS}
        </p>

        <p>
            This will generate a unique URL that you need to visit on the
            new machine.
        </p>

        <div class="add-device-info">
            ${roomName.value ?
                html`<div class="ws-info">
                    The new device should connect to this url:
                </div>
                <div class="url">
                    <code>${roomUrl.value}</code>
                    <span>
                        <copy-button payload="${roomUrl.value}"></copy-button>
                    </span>
                </div>
                ` :
                null
            }
            

            <div class="controls">
                ${roomName.value ?
                    html`<${Btn} class="copy-btn" onClick=${copyUrl}>
                        Copy URL
                    <//>` :
                    null
                }
                <${BtnPrimary} onClick=${initLink}>Add a device<//>
            </div>
        </div>
    </div>`
}
