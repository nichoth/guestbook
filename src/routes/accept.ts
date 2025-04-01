import { html } from 'htm/preact'
import { type HTTPError } from 'ky'
import { useCallback, useEffect } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { State } from '../state.js'
import { TextInput } from '@nichoth/components/htm/text-input'
import { useSignal, batch } from '@preact/signals'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import type { Invitation } from '../types.js'
import './accept.css'
import '../components/dl.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

type Params = {
    token?:string
}

/**
 * Accept invitation route.
 *   - check with the server if the invitation is valid.
 *   - if we are passed a parameter, then call to redeem.
 *     Else, show a text input for the invitation code.
 */
export const AcceptRoute:FunctionComponent<{
    state:ReturnType<typeof State>
    params:Params
}> = function ({ state, params }) {
    const isInvitationValid = useSignal<boolean>(false)
    const isFetchResolving = useSignal<boolean>(false)
    const isCreateResolving = useSignal<boolean>(false)  // create user
    const invitationSignal = useSignal<Invitation|null>(null)
    const fetchInvitationErr = useSignal<string|null>(null)
    const isUserInputOk = useSignal<boolean>(false)
    const redeemInvitationError = useSignal<string|null>(null)

    useEffect(() => {
        if (params && params.token) {
            (async () => {
                isFetchResolving.value = true
                try {
                    const inv = await State.fetchInvitation(state, params.token!)
                    batch(() => {
                        isFetchResolving.value = false
                        invitationSignal.value = inv
                    })
                } catch (_err) {
                    const err = _err as HTTPError
                    batch(async () => {
                        isFetchResolving.value = false
                        fetchInvitationErr.value = await err.response.text()
                    })
                }
            })()
        }
    }, [params && params.token])

    const fetchInvitation = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        try {
            const code = els['invcode'].value
            isFetchResolving.value = true
            const invitation = await State.fetchInvitation(state, code)
            batch(() => {
                isFetchResolving.value = false
                invitationSignal.value = invitation
            })
        } catch (_err) {
            const err = _err as HTTPError
            debug('error accepting invitation', err)
            const errMsg = await err.response.text()
            batch(() => {
                isFetchResolving.value = false
                fetchInvitationErr.value = errMsg
            })
        }
    }, [])

    const acceptInvitation = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        const machineName = els['machine-name'].value || 'Root device'
        try {
            isCreateResolving.value = true
            await State.acceptInvitation(state, invitationSignal.value!.code, {
                username: els['username'].value,
                humanName: els['username'].value,
                bluesky: els['bluesky'].value,
                email: els['email'].value,
                body: els['body'].value
            }, machineName)
            isCreateResolving.value = false
        } catch (_err) {
            debug('got an error', _err)
            const err = _err as HTTPError
            isCreateResolving.value = false
            if (err.response.status === 409) {
                // conflicting email -- show the error
                const text = await err.response.text()
                redeemInvitationError.value = text
            }
        }
    }, [])

    const handleInput = useCallback((ev:InputEvent) => {
        const value = (ev.target as HTMLInputElement).value
        if (value.trim().length) {
            isInvitationValid.value = true
        } else {
            isInvitationValid.value = false
        }
    }, [])

    if (params && params.token) {
        return html`<div class="route accept">
        </div>`
    }

    const userDataInput = useCallback((ev:InputEvent) => {
        const els = (ev.target as HTMLInputElement).form?.elements
        // const isOk
        const username = els!['username']
        const email = els!['email']
        isUserInputOk.value = (username.value && email.value)
    }, [])

    if (invitationSignal.value) {
        // we have fetched the invitation
        // show a form to input your user data
        return html`<div class="route accept">
            <h2>Invitation</h2>
            <dl>
                <dt>Code</dt>
                <dd>${invitationSignal.value.code}</dd>

                <dt>Note</dt>
                <dd>${invitationSignal.value.note}</dd>

                <dt>Created by</dt>
                <dd>${invitationSignal.value.creator?.humanName || 'null'}</dd>
            </dl>

            <h2>Add your contact info</h2>
            <p>
                This information will be visible to other members of the
                website. To become a member, you must be invited by a member.
            </p>

            <hr />

            <form
                class="newuser"
                onSubmit=${acceptInvitation}
                onInput=${userDataInput}
            >
                <${TextInput}
                    name="username"
                    key="new-username"
                    displayName="Your name"
                />
                <div class="help-text">
                    Your name, as you want it to appear on the site.
                </div>

                <${TextInput} type="email" name="email" displayName="email" />
                <div class="help-text">
                    This email address is used to reset your keys if you
                    lose them.
                </div>

                <${TextInput} name="machine-name" displayName="Device name" />
                <div class="help-text">
                    What do you want to call this device?
                </div>
                <div class="help-text">
                    The device name is only visible to you. It is used to
                    distinguish your different devices in the UI.
                </div>

                <${TextInput}
                    type="text"
                    name="bluesky"
                    displayName="Bluesky handle, eg @nichoth.com"
                />

                <label for="text">Any other info (markdown is ok)</label>
                <textarea id="body" name="body"></textarea>

                <div class="controls">
                    <${BtnPrimary}
                        type="submit"
                        disabled=${!isUserInputOk.value}
                        isSpinning=${isCreateResolving}
                    >
                        Accept invitation
                    <//>
                </div>

                ${redeemInvitationError.value ?
                    html`<div class="error">
                        ${redeemInvitationError.value}
                    </div>` :
                    null
                }
            </form>
        </div>`
    }

    return html`<div class="route accept">
        <form onSubmit=${fetchInvitation} class="main-content">
            <${TextInput}
                key="invitation-code"
                onInput=${handleInput}
                id="invcode"
                name="invcode"
                displayName="Invitation code"
            />

            <div class="controls">
                <${BtnPrimary}
                    type="submit"
                    disabled=${!isInvitationValid.value}
                    isSpinning=${isFetchResolving}
                >
                    Fetch Invitation
                <//>
            </div>
        </form>

        ${fetchInvitationErr.value ?
            html`<div class="error invitation-error">
                ${fetchInvitationErr.value}
            </div>` :
            null
        }
    </div>`
}
