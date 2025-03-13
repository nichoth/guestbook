import { html } from 'htm/preact'
import { State } from '../state.js'
import { useCallback } from 'preact/hooks'
import { TextInput } from '@nichoth/components/htm/text-input'
import { type FunctionComponent } from 'preact'
import '@nichoth/components/text-input.css'
import './home.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const HomeRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function HomeRoute ({ state }) {
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

    return html`<div class="route home">
        <h2>Add your contact info</h2>
        <p>
            This will create a pull request with the data you input below.
            It will be reviewed by a human, and if it is not spam, it will
            be merged.
        </p>

        <p>
            The text box below accepts markdown.
        </p>

        <p>
            This information <strong>will be visible publicly</strong>, on the internet.
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
