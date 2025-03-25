import { type Signal, batch, signal } from '@preact/signals'
import PartySocket from 'partysocket'
import { Keys } from '@bicycle-codes/keys'
import Ky, { type KyInstance, type HTTPError } from 'ky'
import Route from 'route-event'
import { SignedRequest, HeaderFactory } from '@bicycle-codes/request'
import type { Invitation, User, Machine, Contact } from './types'
import Debug from '@substrate-system/debug'
import { type RefObject } from 'preact'
import { PARTYKIT_HOST } from '../party/client.js'
import { code, getPartyUrl, when } from './util.js'
// eslint-disable-next-line
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.component.js'
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
    _refs:Signal<{
        success:RefObject<SlAlert>;
        error:RefObject<SlAlert>;
    }|null>;
    myInvitations:Signal<null|false|Invitation[]>;  // false means none
    route:Signal<string>;
    // `null` means we haven't contacted the server yet
    // `false` means we got a response, and this machine is not a user
    user:Signal<null|false|User>;
    list:Signal<null|Contact[]>;
    machines:Signal<Machine[]|null>;
    keys:Signal<Keys|null>;
    party:Signal<PartySocket|null>;  // for users
    newMachineParty:Signal<PartySocket|null>;  // for adding a new machine
    newMachineWords:Signal<null|string[]>;  // words from new machine
    newMachineConfirmed:Signal<boolean>;
    _setRoute:(path:string)=>void;
} {  // eslint-disable-line indent
    const onRoute = Route()

    const state = {
        _refs: signal(null),
        _setRoute: onRoute.setRoute.bind(onRoute),
        myInvitations: signal<null|Invitation[]>(null),
        keys: signal<Keys|null>(null),
        user: signal<User|null|false>(null),
        list: signal(null),
        machines: signal(null),
        party: signal(null),
        newMachineParty: signal(null),
        newMachineWords: signal(null),
        newMachineConfirmed: signal(false),
        route: signal<string>(location.pathname + location.search)
    }

    Keys.load().then(async keys => {
        if (!keys.persisted) {
            state.user.value = false
            // not yet a user, don't create keys yet.
            // We create & persist keys in the `acceptInvitation` function below
            return
        }

        state.keys.value = keys
        ky = SignedRequest(Ky, keys.signKeypair, window.localStorage)
        State.init(state)
    })

    // (async () => {
    //     const res = await Ky.get('/api/guestbook').json()
    //     debug('the response', res)
    // })()

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
    const party = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomName,
        query: { token }
    })
    state.party.value = party
}

/**
 * Called by the existing device, to add a new machine.
 * First we make a POST call to the partykit server, then we listen
 * on the room name.
 */
State.initAddDevice = async function (
    state:ReturnType<typeof State>,
    note?:string,
):Promise<string> {
    const roomName = await collision(state)
    // first a POST call
    // we authenticate as an existing machine
    await ky.post(getPartyUrl(roomName), {
        json: { note },
    })

    const party = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomName
    })

    // room should be "open" now
    // create the ws connection
    state.newMachineParty.value = party

    party.addEventListener('message', ev => {
        // we should get two words from the new machine
        const { words }:{ words:string[] } = JSON.parse(ev.data)
        state.newMachineWords.value = words
        // then you need to confirm in the GUI that the words are ok
    })

    return roomName
}

State.confirmNewMachine = function (state:ReturnType<typeof State>) {
    state.newMachineParty.value?.send(JSON.stringify({ status: 'all done' }))
    state.newMachineParty.value?.close()
}

/**
 * Called by the new machine
 */
State.newMachine = async function (
    state:ReturnType<typeof State>,
    roomCode:string
) {
    const party = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomCode
    })

    state.newMachineParty.value = party

    /**
     * The existing machine will tell us when it
     * confirms the new machine.
     */
    party.addEventListener('message', ev => {
        const msg = JSON.parse(ev.data)
        // we should get just one message that confirms the status
        const { status } = msg
        if (status === 'all done') {
            state.newMachineConfirmed.value = true
            party.close()

            // and open the room for the user only
            if (!state.user.value) return
            state.party.value = new PartySocket({
                host: PARTYKIT_HOST,
                room: state.user.value.username
            })
        }
    })
}

// Delete a machine record
State.removeMachine = async function (
    state:ReturnType<typeof State>,
    machine:Machine
) {
    const res = await ky.delete('/api/machine', {
        json: machine
    })

    state.machines.value = state.machines.value!.filter(m => {
        return m.did !== machine.did
    })

    return res
}

/**
 * Get your user record from the server.
 * This tells us if the current machine has an account.
 * If you have an account, then get the guestlist also.
 */
State.init = async function (state:ReturnType<typeof State>) {
    const data = await State.Login(state)

    if (!data.user) {
        // `false` means this machine is not a member
        state.user.value = false
    }

    if (data.machines) {
        state.machines.value = data.machines
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
    const res = await ky.get('/api/invitation', {
        searchParams: { code: invitationCode }
    }).json<Invitation>()

    debug('got the invitation', res)

    return res
}

State.fetchMyInvitations = async function (
    state:ReturnType<typeof State>
) {
    when(state.user, async () => {
        if (state.myInvitations.value) return  // only fetch once
        debug('**fetching invitations**')
        const invs = await ky.get('/api/invitation').json<Invitation[]>()
        debug('**got my invitations**', invs)
        state.myInvitations.value = invs && invs.length ? invs : false
    })
}

State.fetchList = async function (
    state:ReturnType<typeof State>
) {
    when(state.user, async () => {
        if (state.list.value) return  // only fetch once
        state.list.value = await ky.get('/api/guestbook').json()
        debug('**got the list**')
    })
}

/**
 * Global for toasts.
 * If `duration` is not passed in, the default is 5000 ms.
 */
State.toast = async function (
    state:ReturnType<typeof State>,
    type:'success'|'error',
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

    if (type === 'success') {
        ref.current!.innerHTML = `
            <sl-icon slot="icon" name="check2-circle"></sl-icon>
            ${escapeHtml(content)}
        `
    }

    if (type === 'error') {
        ref.current!.innerHTML = `
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            ${escapeHtml(content)}
        `
    }

    ref.current && await ref.current.toast()
}

State.acceptInvitation = async function (
    state:ReturnType<typeof State>,
    invitationCode:string,
    userData:User,
    machineHumanName:string,
):Promise<void> {
    const keys = await Keys.load()
    // set the ky instance too
    ky = SignedRequest(Ky, keys.signKeypair, window.localStorage)

    const machineName = await keys.deviceName
    const { username: _, ...reqData } = userData

    try {
        await ky.patch('/api/invitation', {
            json: {
                code: invitationCode,
                userData: {
                    ...reqData,
                },
                machine: {
                    did: keys.DID,
                    humanName: machineHumanName
                }
            }
        })

        debug('__invitation accepted__', userData)

        // created the user record, now save the keys locally
        // ask for persistent storage
        if (navigator.storage && navigator.storage.persist) {
            // This asks the user for permission in Firefox.
            // Chrome doesn't ask, automatically determines if it's allowed or not.
            const persistent = await navigator.storage.persist()
            if (persistent) {
                debug('persistence success')
                debug('Storage will not be cleared except by explicit user action')
                localStorage.setItem('persisted', '' + true)
            } else {
                debug('persistence failed')
                debug('Storage may be cleared by the UA under storage pressure.')
            }
        }

        batch(() => {
            state.keys.value = keys
            state.user.value = userData
            state.machines.value = (state.machines.value || []).concat([{
                did: keys.DID,
                humanName: machineHumanName,
                machineName
            }])
        })

        State.toast(state, 'success', 'Invitation accepted.')

        await keys.persist()
        state._setRoute('/')
    } catch (err) {
        debug('error accepting the invitation', err)
        throw err
    }
}

State.createInvitation = async function (state:ReturnType<typeof State>, {
    note
}:{ note?:string }) {
    const inv = await ky.post('/api/invitation', {
        json: {
            note
        }
    }).json<Invitation>()

    debug('called the api, invitation', inv)

    state.myInvitations.value = (state.myInvitations.value || []).concat([inv])
}

State.Login = async function (
    state:ReturnType<typeof State>,
):Promise<{ user:User, machines:Machine[] }> {
    const keys = state.keys
    if (!keys) throw new Error('not keys')
    let res
    try {
        res = await ky.get('/api/login').json<{
            user:User;
            machines:Machine[];
        }>()
    } catch (_err) {
        const err = _err as HTTPError
        if (err.response?.status !== 401) {
            // 401 means they are not a member of the site
            State.toast(state, 'error', err.toString())
        }
    }
    const { machines, user } = res
    batch(async () => {
        state.user.value = user
        state.machines.value = await Promise.all(machines.map(async machine => {
            return { ...machine, machineName: machine.machineName }
        }))
    })

    return { user, machines }
}

function escapeHtml (html:string) {
    const div = document.createElement('div')
    div.textContent = html
    return div.innerHTML
}

/**
 * Get a room in partykit. Make sure it doesn't collide with
 * any other room.
 */
async function collision (
    state:ReturnType<typeof State>,
    roomName?:string
):Promise<string> {
    if (!roomName) roomName = code()

    try {
        // 200 response means the room is available
        await ky.head(getPartyUrl(roomName))
        return roomName
    } catch (_err) {
        const err = _err as HTTPError
        if (err.response.status === 409) {
            // 409 response to a `HEAD` request means
            // the room is taken, so try again
            return collision(state, code())
        } else {
            // should not get any other errors
            throw err
        }
    }
}
