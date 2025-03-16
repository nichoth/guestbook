import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { type State } from '../state.js'
import './link.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Route that shows your identity.
 */
export const WhoamiRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const user = state.user.value
    if (!user) return null

    return html`<div class="route whoami">
        <h2>Who am I?</h2>
    </div>`
}
