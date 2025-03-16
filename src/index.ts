import { html } from 'htm/preact'
import { type FunctionComponent, render } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { Nav } from './nav.js'
import { State } from './state.js'
import Router from './routes/index.js'
import '@substrate-system/css-normalize'
import './style.css'
import type { SlAlert } from '@shoelace-style/shoelace'
import '@shoelace-style/shoelace/dist/components/alert/alert.js'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
// import { createDebug } from '@substrate-system/debug'
// const debug = createDebug()

const state = State()
const router = Router(state)

if (import.meta.env.DEV || import.meta.env.MODE === 'staging') {
    // @ts-expect-error DEV env
    window.state = state
    // @ts-expect-error DEV env
    window.State = State
}

export const Guestbook:FunctionComponent = function () {
    const match = router.match(state.route.value)
    if (!match) {
        return html`<div class="404">
            <h1>404</h1>
        </div>`
    }

    const ChildNode = match.action!(match, state.route)
    const { params } = match

    const successToast = useRef<SlAlert>(null)
    useEffect(() => {
        state._refs.value = {
            success: successToast
        }
    }, [])

    // how to tell if someone is "logged in"?
    // need to right away get their keys, then call the server to get
    // a user record

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

        <sl-alert variant="success" ref=${successToast} closable=${true}><//>
    </div>`
}

render(html`<${Guestbook} />`, document.getElementById('root')!)
