import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { type Signal } from '@preact/signals'
import './mobile-nav-menu.css'

interface Props {
    isOpen:Signal<boolean>
}

export const MobileNav:FunctionComponent<Props> = function (props) {
    const { isOpen, children } = props

    function navClick () {
        isOpen.value = false
    }

    return (html`<div class=${('mobile-nav-menu' + (isOpen.value ?
        ' open' : ' closed'))}
    >
        <ul>
            ${Array.isArray(children) && children.map((el, i) => {
                return (html`<li key=${i} onClick=${navClick}>
                    ${el}
                </li>`)
            })}
        </ul>
    </div>`)
}

export default MobileNav
