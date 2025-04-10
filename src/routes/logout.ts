import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import type { State } from '../state/index.js'
import './login.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Route for requesting a login code via email.
 *
 * @TODO
 * Should deduplicate requests. Only create a new pending login record if
 * one does not already exist for the given email.
 */
export const LogoutRoute:FunctionComponent<{
    state:ReturnType<typeof State>;
}> = function ({ state }) {
    debug('logout route', state)
    return html`<div class="route logout">
        <div class="success">Logged out.</div>
    </div>`
}
