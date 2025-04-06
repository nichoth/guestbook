import { html } from 'htm/preact'
// import { TextInput } from '@nichoth/components/htm/text-input'
// import { Primary as BtnPrimary } from '../components/button-outline.js'
// import { useCallback } from 'preact/hooks'
// import { useSignal, useComputed } from '@preact/signals'
// import { type HTTPError } from 'ky'
import { type FunctionComponent } from 'preact'
import { type State } from '../state/index.js'
import './login.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * When you are on a new machine, redeeming a login code.
 */
export const LoginAccept:FunctionComponent<{
    state:ReturnType<typeof State>
    params:{ code:string }
}> = function ({ params }) {
    debug('accept login route params', params)

    return html`<div class="route login-accept">
        logged in now
    </div>`
}
