import { html } from 'htm/preact'
import type { State } from '../state.js'
import { type FunctionComponent } from 'preact'
import './link.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const ListRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    debug('link route', state)

    return html`<div class="route list">
        <p>List here</p>
    </div>`
}
