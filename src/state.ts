import { type Signal, batch, signal } from '@preact/signals'
import { Keys } from '@bicycle-codes/keys'
import Ky, { type KyInstance } from 'ky'
import Route from 'route-event'
import { SignedRequest, HeaderFactory } from '@bicycle-codes/request'
import type { Invitation, User, Machine } from './types'
import Debug from '@substrate-system/debug'
import { type RefObject } from 'preact'
import { Party } from '../party/client.js'
// eslint-disable-next-line
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.component.js'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
import type PartySocket from 'partysocket'
const debug = Debug()

// set this incase they are not a user. We still try to login.
let ky:KyInstance = Ky

/**
 * Setup any state
 *   - routes
 *   - keys
 *   - user data
 */
export function State ():{
    _refs:Signal<{ success:RefObject<SlAlert> }|null>
    route:Signal<string>;
    // `null` means we haven't contacted the server yet
    // `false` means we got a response, and this machine is not a user
    user:Signal<null|false|User>;
    machines:Signal<Machine[]|null>;
    keys:Signal<Keys|null>;
    party:Signal<PartySocket|null>;
    _setRoute:(path:string)=>void;
} {  // eslint-disable-line indent
    const onRoute = Route()

    const state = {
        _refs: signal(null),
        _setRoute: onRoute.setRoute.bind(onRoute),
        keys: signal<Keys|null>(null),
        user: signal(null),
        machines: signal(null),
        party: signal(null),
        route: signal<string>(location.pathname + location.search)
    }

    Keys.load().then(async keys => {
        if (!keys.persisted) return  /* is not yet a user, don't create keys yet
        we create & persist keys in the `acceptInvitation` function below */
        state.keys.value = keys
        ky = SignedRequest(Ky, keys.signKeypair, window.localStorage)
        State.init(state)
    })

    /**
     * set the app state to match the browser URL
     */
    onRoute((path:string, data) => {
        // for github pages
        const newPath = path.replace('/template-ts-preact-htm/', '/')
        state.route.value = newPath
        // handle scroll state like a web browser
        // (restore scroll position on back/forward)
        if (data.popstate) {
            return window.scrollTo(data.scrollX, data.scrollY)
        }
        // if this was a link click (not back button), then scroll to top
        window.scrollTo(0, 0)
    })

    return state
}

/**
 * Open a connection for your username.
 * You must be "logged in" to do this; must have a keypair.
 */
State.Party = async function (state:ReturnType<typeof State>, roomName:string) {
    const keys = state.keys.value!
    const createHeader = HeaderFactory(
        keys.signKeypair,
        { deviceName: await keys.deviceName },
        window.localStorage
    )
    const token = await createHeader()
    const party = Party(roomName, token)
    state.party.value = party
}

// Delete a machine record
State.removeMachine = async function (
    state:ReturnType<typeof State>,
    machine:Machine
) {
    return await ky.delete('/api/machine', {
        json: machine
    })
}

/**
 * Get your user record from the server.
 * This tells us if the current machine has an account.
 */
State.init = async function (state:ReturnType<typeof State>) {
    const data = await State.Login(state)

    if (!data.user) {
        state.user.value = false
    }
}

/**
 * Add your contact info.
 */
State.add = async function (state:ReturnType<typeof State>, data:{
    username;
    email;
    bluesky;
    body;
}) {
    debug('adding things', state, data)
    ky.post('/api/guestbook', {
        json: data
    })
}

State.forgot = async function (
    state:ReturnType<typeof State>,
    email:string
) {
    return ky.post('/api/forgot', {
        json: { email }
    })
}

/**
 * A new user checking if an invitation code is ok.
 */
State.fetchInvitation = async function (
    state:ReturnType<typeof State>,
    invitationCode:string
):Promise<Invitation> {
    debug('fetching invitation', invitationCode)
    const res = await ky.get('/api/invitation', {
        searchParams: { code: invitationCode }
    }).json<Invitation>()

    debug('got the invitation', res)

    return res
}

/**
 * Global for toasts.
 * If `duration` is not passed in, the default is 5000 ms.
 */
State.toast = async function (
    state:ReturnType<typeof State>,
    type:'success',
    content:string,
    opts:Partial<{
        duration:number
    }> = {}
):Promise<void> {
    const refs = state._refs.value!
    const ref = refs[type]

    ref.current?.setAttribute(
        'duration',
        '' + (opts.duration === undefined ? 5000 : null)
    )

    ref.current!.innerHTML = `
        <sl-icon slot="icon" name="check2-circle"></sl-icon>
        ${escapeHtml(content)}
    `

    ref.current && await ref.current.toast()
}

State.acceptInvitation = async function (
    state:ReturnType<typeof State>,
    invitationCode:string,
    userData:User,
    humanName:string,
) {
    const keys = await Keys.load()
    // set the ky instance too
    ky = SignedRequest(Ky, keys.signKeypair, window.localStorage)

    const machineName = await keys.deviceName

    try {
        await ky.patch('/api/invitation', {
            json: {
                code: invitationCode,
                userData,
                machine: {
                    did: keys.DID,
                    humanName
                }
            }
        })

        // created the user record, now save the keys locally
        // ask for persistent storage
        if (navigator.storage && navigator.storage.persist) {
            // This asks the user for permission in Firefox.
            // Chrome doesn't ask, automatically determines if it's allowed or not.
            const persistent = await navigator.storage.persist()
            if (persistent) {
                debug('Storage will not be cleared except by explicit user action')
            } else {
                debug('Storage may be cleared by the UA under storage pressure.')
            }
        }

        debug('__invitation accepted__', userData)

        batch(() => {
            state.keys.value = keys
            state.user.value = userData
            state.machines.value = (state.machines.value || []).concat([{
                did: keys.DID,
                humanName,
                machineName
            }])
        })

        await keys.persist()
        state._setRoute('/')
    } catch (err) {
        debug('error accepting the invitation', err)
        throw err
    }
}

State.Login = async function (
    state:ReturnType<typeof State>,
):Promise<{ user:User, machines:Machine[] }> {
    const keys = state.keys
    if (!keys) throw new Error('not keys')
    const userData = await ky.get('/api/login').json<User & {
        machines: Machine[]
    }>()
    const { machines, ...stateData } = userData
    batch(async () => {
        state.user.value = stateData
        state.machines.value = await Promise.all(machines.map(async machine => {
            const machineName = await Keys.deviceName(machine.did)
            return { ...machine, machineName }
        }))
    })

    return { user: stateData, machines }
}

function escapeHtml (html:string) {
    const div = document.createElement('div')
    div.textContent = html
    return div.innerHTML
}
