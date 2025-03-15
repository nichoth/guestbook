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
        <p class="explanation">
            A guestbook for <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://innovatebellingham.org/"
            >
                Innovate Bellingham
            </a>
        </p>

        <hr />

        <p>
            Are you already a member? <a href="/link">
                Link this device to your existing account.</a>
        </p>
        <p>
            Or <a href="/accept">accept an invitation</a>.
        </p>

        <p>
            Lost your keys? <a href="lost">Reset your keys</a>.
        </p>

        <hr />

        <p>
            This is a contact list for the <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://innovatebellingham.org/"
            >Innovate Bellingham</a> meeting.
        </p>

        <p>
            The contact list is only visible to other
            members of the group. To join this group, you must be invited by
            someone who is already a member.
        </p>
    </div>`
}
