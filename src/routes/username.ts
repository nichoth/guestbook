import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useComputed } from '@preact/signals'
import type { State } from '../state/index.js'
import type { User } from '../types.js'
import { Profile } from '../components/profile.js'

export const UsernameRoute:FunctionComponent<{
    state:ReturnType<typeof State>
    params:{ username }
}> = function ({ state, params }) {
    const { username } = params
    const user = useComputed<null|User>(() => {
        if (!state.list.value) return null
        const found = state.list.value?.find(u => u.username === username)
        return found || null
    })

    if (state.list.value && !user.value) {
        return html`<div class="route username">
            <div class="fourzerofour">404</div>
            <div>Not found.</div>
        </div>`
    }

    if (!user.value) return null

    return html`<div class="route username">
        <h2>${user.value.humanName}</h2>

        <${Profile} user=${user.value} />
    </div>`
}
