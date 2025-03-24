import { html } from 'htm/preact'
import { type FunctionComponent, render } from 'preact'
import { useCallback, useEffect, useRef } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { Nav } from './nav.js'
import { State } from './state.js'
import Router from './routes/index.js'
import { HamburgerWrapper } from './components/hamburger.js'
import { MobileNav } from './components/mobile-nav-menu.js'
import '@substrate-system/css-normalize'
import './style.css'
import type { SlAlert } from '@shoelace-style/shoelace'
import '@shoelace-style/shoelace/dist/components/alert/alert.js'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
import { createDebug } from '@substrate-system/debug'
const debug = createDebug()

const state = State()
const router = Router(state)

if (import.meta.env.DEV || import.meta.env.MODE === 'staging') {
    // @ts-expect-error DEV env
    window.state = state
    // @ts-expect-error DEV env
    window.State = State
}

export const Guestbook:FunctionComponent = function () {
    const isHamburgerOpen = useSignal<boolean>(false)
    const match = router.match(state.route.value)
    let ChildNode
    let params = {}
    if (!match || !match.action) {
        ChildNode = () => html`<div class="fourzerofour">
            <h1>404</h1>
            <p>Path not found.</p>
        </div>`
    } else {
        ChildNode = match.action(match, state.route.value)
        params = match.params
    }

    debug('the match', match)
    console.log('match', match)
    debug('the child', ChildNode)
    debug('the path', state.route.value)

    const successToast = useRef<SlAlert>(null)
    useEffect(() => {
        state._refs.value = {
            success: successToast
        }
    }, [])

    const hamburgler = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        isHamburgerOpen.value = !(isHamburgerOpen.value)
    }, [])

    return html`<div>
        <${HamburgerWrapper}
            onClick=${hamburgler}
            isOpen=${isHamburgerOpen}
        ><//>

        <${MobileNav} isOpen=${isHamburgerOpen}>
            <a className="app-nav" href="/example">Example</a>
            <a className="app-nav" href="/example2">Example2</a>
            <a className="app-nav" href="/example3">Example3</a>
        <//>

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
