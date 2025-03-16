import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { useCallback } from 'preact/hooks'
import { State } from '../state.js'
import { type FunctionComponent } from 'preact'
import './add.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const AddRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const submit = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        const body = els['text'].value
        const username = els['username'].value
        const email = els['email'].value
        const bluesky = els['bluesky'].value
        debug('requesting...', body)
        await State.add(state, { body, username, email, bluesky })
        debug('all done')
    }, [])

    return html`<div class="route add">
        <h2>Add your contact info</h2>
        <p>
            The text box below accepts markdown.
        </p>

        <p>
            This information will be visible to other members of this website.
            To become a member, you must be invited by an existing member.
        </p>

        <hr />

        <form onSubmit=${submit}>
            <${TextInput} name="username" displayName="Your name" />
            <${TextInput} type="email" name="email" displayName="email" />
            <${TextInput}
                type="text"
                name="bluesky"
                displayName="Bluesky handle, eg @nichoth.com"
            />
            <${TextInput} type="text" name="link" displayName="Any other link" />
            <label for="text">Any other info (markdown is ok)</label>
            <textarea id="text" name="text"></textarea>
            <div class="controls">
                <button type="submit">
                    Submit
                </button>
            </div>
        </form>
    </div>`
}
