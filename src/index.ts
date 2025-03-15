import { html } from 'htm/preact'
import { type FunctionComponent, render } from 'preact'
import { Nav } from './nav.js'
import { State } from './state.js'
import Router from './routes/index.js'
import '@substrate-system/css-normalize'
import './style.css'
// import { createDebug } from '@substrate-system/debug'
// const debug = createDebug()

const state = State()
const router = Router(state)

if (import.meta.env.DEV || import.meta.env.MODE === 'staging') {
    // @ts-expect-error DEV env
    window.state = state
}

export const Guestbook:FunctionComponent = function Example () {
    const match = router.match(state.route.value)
    if (!match) {
        return html`<div class="404">
            <h1>404</h1>
        </div>`
    }

    const ChildNode = match.action!(match, state.route)
    const { params } = match

    // how to tell if someone is "logged in"?
    // need to right away get their keys, and call the server

    return html`<div>
        <header>
            <h1>
                <a href="/">
                    Guestbook
                </a>
            </h1>

            <${Nav} state=${state} />
        </header>
        <${ChildNode} state=${state} params=${params} />
    </div>`
}

render(html`<${Guestbook} />`, document.getElementById('root')!)
