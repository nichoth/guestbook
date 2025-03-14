import { html } from 'htm/preact'
import { type FunctionComponent, render } from 'preact'
import { State } from './state.js'
import Router from './routes/index.js'
import '@substrate-system/css-normalize'
import './style.css'
// import { createDebug } from '@substrate-system/debug'
// const debug = createDebug()

const router = Router()
const state = State()

if (import.meta.env.DEV || import.meta.env.MODE === 'staging') {
    // @ts-expect-error DEV env
    window.state = state
}

export const Guestbook:FunctionComponent = function Example () {
    const match = router.match(state.route.value)
    const ChildNode = match.action(match, state.route)

    if (!match) {
        return html`<div class="404">
            <h1>404</h1>
        </div>`
    }

    // how to tell if someone is "logged in"?
    // need to right away get their keys, and call the server

    return html`<div>
        <header>
            <h1>
                <a href="/">
                    Bellingham Guestbook
                </a>
            </h1>

            <nav class="nav">
                <ul>
                    <li><a href="/">Index</a></li>
                </ul>
            </nav>
        </header>
        <p class="explanation">
            A guestbook for <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://innovatebellingham.org/"
            >
                Innovate Bellingham
            </a>
        </p>

        <${ChildNode} state=${state} />
    </div>`
}

render(html`<${Guestbook} />`, document.getElementById('root')!)
