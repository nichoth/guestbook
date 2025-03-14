import { html } from 'htm/preact'
import { type State } from '../state.js'
import { type FunctionComponent } from 'preact'
import '@nichoth/components/text-input.css'
import './home.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const HomeRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function HomeRoute ({ state }) {
    debug('home route', state)
    return html`<div class="route home">
        <p>
            Are you already a member? <a href="/link">
                Link this device to an existing account.</a>
        </p>
        <p>
            Or <a href="/accept">redeem an invitation.</a>
        </p>
    </div>`
}
