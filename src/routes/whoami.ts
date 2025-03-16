import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { type State } from '../state.js'
import { marked } from 'marked'
import { Keys } from '@bicycle-codes/keys'
import { Dot } from '../components/dot.js'
import '../components/dl.css'
import './whoami.css'
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

    debug('state.user', state.user.value)

    return html`<div class="route whoami">
        <h2>Who am I?</h2>
        <div class="profile">
            <dl>
                <dt>name</dt>
                <dd>${user.username}</dd>
                <dt>email</dt>
                <dd>${user.email}</dd>
                <dt>note</dt>
                <dd class="note">
                    ${user.body ?
                        html`<div class="markdown">
                            ${marked.parse(user.body)}
                        </div>` :
                        html`<em class="none">none</em>`
                    }
                </dd>
            </dl>

            <h2>Your Devices</h2>
            <ul>
                ${state.machines.value?.map(machine => {
                    return html`<li key=${Keys.deviceName(machine.did)}>
                        <${Dot} color="gray" />
                        ${machine.humanName}
                    </li>`
                })}
            </ul>
        </div>
    </div>`
}
