import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { type State } from '../state.js'
import './link.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Route for if you lost your keys.
 */
export const WhoamiRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    return html`<div class="route whoami">
    </div>`
}
