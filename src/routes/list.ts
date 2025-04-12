import { html } from 'htm/preact'
import type { State } from '../state/index.js'
import { type FunctionComponent } from 'preact'
import { Profile } from '../components/profile.js'
import '../components/dl.css'
import './list.css'
import { useSignalEffect } from '@preact/signals'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const ListRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    useSignalEffect(() => {
        if (!state.list.value) {
            document.body.classList.add('loading')
        } else {
            document.body.classList.remove('loading')
        }
    })

    return html`<div class="route list">
        <h2>The List</h2>

        ${state.list.value ?
            html`<ul class="contacts">
                ${state.list.value?.map(contact => {
                    return html`<li class="contact">
                        <a href="/contact/${contact.username}">
                            <${Profile} context="list" user=${contact} />
                        </a>
                    </li>`
                })}
            </ul>` :
            html`<ul class="contacts"></ul>`
        }
    </div>`
}
