import { html } from 'htm/preact'
import type { State } from '../state.js'
import { ELLIPSIS, NBSP } from '@substrate-system/util/constants'
import { type FunctionComponent } from 'preact'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import './link.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const LinkRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    debug('link route', state)

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
            <div class="controls">
                <${BtnPrimary}>Add a device<//>
            </div>
        </div>
    </div>`
}
