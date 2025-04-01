import { html } from 'htm/preact'
import { type State } from '../state/index.js'
import { type FunctionComponent } from 'preact'
import { NBSP } from '@substrate-system/util/constants'
import '@nichoth/components/text-input.css'
import './home.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const HomeRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function HomeRoute ({ state }) {
    return html`<div class="route home">
        <p class="explanation">
            A guestbook for the internet.
        </p>

        <hr />

        <p>
            This is a contact list, originally designed for the <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://innovatebellingham.org/"
            >Innovate Bellingham meetings</a>. It is a demonstration of various
            web technologies, notably, the <a href="/about#keys">login system
            </a>, which is nice because there are no passwords.
        </p>

        <${MainPart} state=${state} />
    </div>`
}

function MainPart ({ state }:{ state:ReturnType<typeof State> }) {
    if (state.user.value === null) {
        // null means the login request is resolving
        return null
    }

    if (!state.user.value) {  // false means this machine is not authorized
        return html`
            <p>
                This is a contact list for the <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://innovatebellingham.org/"
                >Innovate Bellingham</a> meeting. It is only visible to other
                members of the group. To join, you must be invited by
                a member.
            </p>

            <p>
                Are you a member? <a href="/link">
                    Link this device to your existing account</a>.
                ${NBSP}Or, <a href="/login">request a single-use login code.</a>
            </p>
            <p>
                Or <a href="/accept">accept an invitation</a>.
            </p>

            <p>
                Lost your keys? <a href="lost">Reset your keys</a>.
            </p>
        `
    }

    return html`<p>Welcome,${NBSP} <code>${state.user.value.humanName}</code>.</p>`
}
