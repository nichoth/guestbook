import { html } from 'htm/preact'
import type { FunctionComponent } from 'preact'
import { type State } from './state'

export const Nav:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function Nav ({ state }) {
    const route = state.route.value

    const links = [
        { href: '/', text: 'Index' },
        state.user.value ? { href: '/list', text: 'The List' } : null,
        state.user.value ? { href: '/link', text: 'Add a device' } : null,
        state.user.value ? { href: '/invitations', text: 'Invitations' } : null,
        state.user.value ? { href: '/whoami', text: 'Who am I?' } : null,
        { href: '/about', text: 'Colophon' }
    ].filter(Boolean)

    return html`<nav class="nav">
        <ul>
            ${links.map(link => {
                const isActive = route === link.href
                const classes = ['nav-link', isActive ? 'active' : '']
                    .filter(Boolean)
                    .join(' ')

                return html`<li class="${classes}">
                    <a href="${link.href}">${link.text}</a>
                </li>`
            })}
        </ul>
    </nav>`
}
