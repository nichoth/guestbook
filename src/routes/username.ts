import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import type { State } from '../state/index.js'

export const UsernameRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    return html`<div class="route username">

    </div>`
}
