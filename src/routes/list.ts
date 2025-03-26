import { html } from 'htm/preact'
import type { State } from '../state.js'
import { type FunctionComponent } from 'preact'
import { Profile } from '../components/profile.js'
import './link.css'
import './list.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const ListRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    return html`<div class="route list">
        <h2>The List</h2>

        ${state.list.value ?
            html`<ul class="contacts">
                ${state.list.value?.map(contact => {
                    return html`<li class="contact">
                        <${Profile} user=${contact} />
                    </li>`
                })}
            </ul>` :
            null
        }
    </div>`
}
