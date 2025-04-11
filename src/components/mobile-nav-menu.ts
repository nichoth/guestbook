import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useCallback } from 'preact/hooks'
import { type Signal } from '@preact/signals'
import { BtnLogout } from './button-logout.js'
import './mobile-nav-menu.css'

interface Props {
    isOpen:Signal<boolean>
    onLogout:(ev:MouseEvent)=>any
}

export const MobileNav:FunctionComponent<Props> = function (props) {
    const { isOpen, children, onLogout } = props

    function navClick () {
        isOpen.value = false
    }

    const logout = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        isOpen.value = false
        onLogout(ev)
    }, [])

    return (html`<div class=${('mobile-nav-menu' + (isOpen.value ?
        ' open' : ' closed'))}
    >
        <ul>
            ${Array.isArray(children) && children.map((el, i) => {
                return (html`<li key=${el.key || i} onClick=${navClick}>
                    ${el}
                </li>`)
            })}
        </ul>

        <ul class="controls">
            <li>
                <${BtnLogout} onClick=${logout} />
                <span>Logout</span>
            </li>
        </ul>
    </div>`)
}

export default MobileNav
