import { html } from 'htm/preact'
import { type FunctionComponent, render } from 'preact'
import { createDebug } from '@substrate-system/debug'
import ky from 'ky'
import { State } from './state.js'
import Router from './routes/index.js'
import '@substrate-system/css-normalize'
import './style.css'

const router = Router()
const state = State()
const debug = createDebug()

if (import.meta.env.DEV || import.meta.env.MODE === 'staging') {
    // @ts-expect-error DEV env
    window.state = state
}

// example of calling our API
const json = await ky.get('/api/example').json()

export const Example:FunctionComponent = function Example () {
    debug('rendering example...')
    const match = router.match(state.route.value)
    const ChildNode = match.action(match, state.route)

    if (!match) {
        return html`<div class="404">
            <h1>404</h1>
        </div>`
    }

    return html`<div>
        <h1>Bellingham Guestbook</h1>
        <p>
            A guestbook for <a href="https://innovatebellingham.org/">
                Innovate Bellingham
            </a>
        </p>

        <h2>the API response</h2>
        <pre>
            ${JSON.stringify(json, null, 2)}
        </pre>

        <${ChildNode} />
    </div>`
}

render(html`<${Example} />`, document.getElementById('root')!)
