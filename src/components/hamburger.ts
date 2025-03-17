import { html } from 'htm/preact'
import type { ComponentChildren, FunctionComponent } from 'preact'
import { useSignalEffect, type Signal } from '@preact/signals'
import './hamburger.css'

interface Props {
    children?:ComponentChildren;
    onClick:()=>any;
    isOpen:Signal<boolean>;
}

export const HamburgerWrapper:FunctionComponent<Props> = function (props) {
    const { children, onClick, isOpen } = props

    useSignalEffect(() => {
        if (!isOpen.value) {
            document.body.classList.remove('hamburging')
        } else {
            document.body.classList.add('hamburging')
        }
    })

    return (html`<div class="${'hamburger-wrapper' +
        (isOpen.value ? ' open' : '')}"
    >
        ${children}
        <${Hamburger} isOpen=${isOpen} onClick=${onClick} />
    </div>`)
}

export default HamburgerWrapper

export function Hamburger ({ onClick, isOpen }) {
    return (html`<div class="${'hamburger' + (isOpen.value ? ' open' : '')}">
        <input type="checkbox" id="burger-checkbox" checked=${isOpen} />
        <label class="burger" for="burger-checkbox" onClick=${onClick}>
            <button onClick=${onClick}>
                <div class="container top">
                    <div class="line top"><//>
                </div>
                <div class="container middle">
                    <div class="line middle"><//>
                </div>
                <div class="container bottom">
                    <div class="line bottom"><//>
                </div>
            </button>
        </label>
    </div>`)
}
