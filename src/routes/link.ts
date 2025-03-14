import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { useCallback } from 'preact/hooks'
import type { State } from '../state.js'
import { type FunctionComponent } from 'preact'
import './link.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const LinkRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    debug('link route', state)

    return html`<div class="route add">
        <p>Link controls here</p>
    </div>`
}
