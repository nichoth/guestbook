import { type Signal, batch, signal } from '@preact/signals'
import { Connection } from '@hello-system/connect'
import PartySocket from 'partysocket'
import { Keys } from '@bicycle-codes/keys'
import Ky, { type KyInstance, type HTTPError } from 'ky'
import Route from 'route-event'
import { SignedRequest, HeaderFactory } from '@bicycle-codes/request'
import Debug from '@substrate-system/debug'
import { type RefObject } from 'preact'
import type SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.component.js'
import type { Invitation, User, Machine, Contact, ClientSideMachine } from '../types'
import { when } from '../util.js'
import { type NewMachine } from '../routes/link.js'
const debug = Debug()

export const PARTYKIT_HOST = (import.meta.env.MODE === 'development' ?
    'http://localhost:1999' :
    'https://bellingham-guestbook.nichoth.partykit.dev')

// set this incase they are not a user. We still try to login.
let ky:KyInstance = Ky

/**
 * Setup state
 *   - route handling
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
    machines:Signal<(ClientSideMachine|NewMachine)[]|null>;
    keys:Signal<InstanceType<typeof Keys>|null>;
    presenceParty:Signal<PartySocket|null>;  // for user presence
    party:Signal<PartySocket|null>;  // for adding a new machine
    error:Signal<{ code:number, message:string }|null>;
    _setRoute:(path:string)=>void;
} {  // eslint-disable-line indent
    const onRoute = Route()

    window.onerror = function (ev:string|Event) {
        debug('**unhandled error**', ev)
    }

    window.addEventListener('unhandledrejection', ev => {
        debug('**uncaught promise error**', ev)
    })

    const state = {
        _refs: signal(null),
        _setRoute: onRoute.setRoute.bind(onRoute),
        myInvitations: signal<null|Invitation[]>(null),
        keys: signal<InstanceType<typeof Keys>|null>(null),
        user: signal<User|null|false>(null),
        list: signal(null),
        machines: signal(null),
        presenceParty: signal(null),
        party: signal(null),
        notes: signal(null),
        error: signal(null),
        route: signal<string>(location.pathname + location.search)
    }

    Keys.load().then(keys => {
        if (!keys.persisted) {
            debug('not persisted keys')
            // not yet a user, don't create keys yet.
            // We create & persist keys in the `acceptInvitation` function,
            // or the `newDeviceApproved` function
            state.user.value = false
            return
        }

        state.keys.value = keys
        ky = SignedRequest(Ky, keys.signKeypair, window.localStorage)
        State.init(state)
    })

    /**
     * set the app state to match the browser URL
     */
    onRoute((path:string, data) => {
        // for github pages
        state.route.value = path
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
 * The user must be "logged in" to do this, must have a keypair.
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
    note:string,
):Promise<[string, Connection]> {
    const createHeaders = HeaderFactory({
        privateKey: state.keys.value!.privateSignKey,
        publicKey: state.keys.value!.publicSignKey
    })

    const thisMachine = (state.machines.value || []).find(async machine => {
        return machine.machineName === await state.keys.value?.deviceName
    })
    const myName = thisMachine?.humanName

    const [roomName, ws] = await Connection.init(
        PARTYKIT_HOST,
        {
            headers: { authorization: await createHeaders() },
            note,
            data: { oldMachineName: myName }
        }
    )

    state.party.value = ws

    return [roomName, ws]
}

/**
 * Called by the new machine.
 *   - Connect to the room created by the existing device.
 *   - Maybe send a note with your connection message
 * @returns {Connection} The connection we just created. Need to
 *   listen for events in the view code.
 */
State.newMachineConnect = async function (
    state:ReturnType<typeof State>,
    code:string,
    data:{ newMachineName:string, note:string }
):Promise<Connection> {
    const keys:InstanceType<typeof Keys> = state.keys.value || await Keys.load()
    const ws = await Connection.join(code, PARTYKIT_HOST, {
        note: data.note,
        data: {
            newMachineName: data.newMachineName,
            did: keys.DID  // send our DID to the new machine
        }
    })

    ws.addEventListener('approve', async function onApprove () {
        if (!keys.persisted) {
            await keys.persist()
        }
        ws.removeEventListener('approve', onApprove)
        ws.close()
    })

    state.party.value = ws

    return ws
}

// Delete a machine record
State.removeMachine = async function (
    state:ReturnType<typeof State>,
    machine:Machine
) {
    debug('removing this one...', machine)

    const res = await ky.delete('/api/machine', {
        json: machine
    })

    state.machines.value = state.machines.value!.filter(m => {
        return m.machineName !== machine.machineName
    })

    return res
}

State.pushMachine = function (
    state:ReturnType<typeof State>,
    machine:NewMachine
) {
    state.machines.value = (state.machines.value || []).concat([machine])
}

State.newDeviceApproved = async function (state:ReturnType<typeof State>) {
    if (!state.keys.value?.persisted) {
        const keys = await Keys.load()
        await keys.persist()
        state.keys.value = keys
    }

    ky = SignedRequest(Ky, state.keys.value.signKeypair, window.localStorage)

    const res = await State.Login(state)
    debug('new device added and logged in', res)
}

/**
 * Get your user record from the server.
 */
State.init = async function (state:ReturnType<typeof State>):Promise<void> {
    if (!state.keys.value) return
    const data = await State.Login(state)
    debug('init', data)

    if (!data.user) {
        // `false` means this machine is not a member
        state.user.value = false
    }

    if (data.machines) {
        state.machines.value = data.machines
    }
}

State.updateProfile = async function (
    state:ReturnType<typeof State>,
    newUserData:User
) {
    try {
        await ky.put('/api/profile', {
            json: newUserData
        })

        state.user.value = newUserData
        const list = state.list.value
        if (!list) return
        const index = state.list.value?.findIndex(val => {
            return val.email === newUserData.email
        })

        if (!index || index < 0) return
        const newList = list.concat([])
        newList[index] = newUserData
        state.list.value = newList
    } catch (_err) {
        debug('update failure', _err)
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

State.deleteInvitation = async function (
    state:ReturnType<typeof State>,
    code:string
):Promise<void> {
    try {
        await ky.delete('/api/invitation', {
            json: { code }
        })

        state.myInvitations.value = (state.myInvitations.value || [])
            .filter(inv => {
                return inv.code !== code
            })
    } catch (_err) {
        const err = _err as HTTPError
        debug('error deleting this', err)
        throw err
    }
}

/**
 * A new user checking if an invitation code is ok, or an existing
 * user getting a single invitation of theirs.
 * The server looks at the headers to know if they are a user or not.
 */
State.fetchInvitation = async function (
    state:ReturnType<typeof State>,
    invitationCode:string
):Promise<Invitation> {
    const res = await ky.get('/api/invitation', {
        searchParams: { code: invitationCode }
    }).json<Invitation>()

    return res
}

State.fetchMyInvitations = async function (
    state:ReturnType<typeof State>
) {
    when(state.user, async () => {
        debug('**fetching invitations**')
        try {
            const invs = await ky.get('/api/invitation').json<Invitation[]>()
            debug('**got my invitations**', invs)
            state.myInvitations.value = invs && invs.length ? invs : false
        } catch (_err) {
            const err = _err as HTTPError
            debug('error fetching invitations', await err.response.text())
        }
    })
}

/**
 * GET the list.
 */
State.fetchList = async function (
    state:ReturnType<typeof State>
) {
    when(state.user, async () => {
        if (state.list.value) return  // only fetch once
        state.list.value = await ky.get('/api/guestbook').json()
    })
}

/**
 * GET a user by their slug. Must authenticate for this.
 * We are just fetching the entire list for this usecase, because
 * it is easier to develop (no additional backend logic).
 *
 * @throws {Error} If the user cannot be found in the database.
 */
State.fetchUser = async function (
    state:ReturnType<typeof State>,
    userSlug:string
):Promise<User> {
    const slug = userSlug.trim()
    // do we have them already?
    let user = state.list.value?.find(item => item.username === slug)
    if (user) return user

    // else, fetch the list
    await State.fetchList(state)
    user = state.list.value?.find(u => u.username === slug)

    if (!user) throw new Error('Not user')

    return user
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

    let duration:number
    if (type === 'error') {
        duration = Infinity
    } else {  // not error type
        duration = opts.duration ?? 5000
    }

    ref.current?.setAttribute(
        'duration',
        '' + duration
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
                user: userData.email,
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
    note,
    uses
}:{ note?:string, uses:number }) {
    try {
        const inv = await ky.post('/api/invitation', {
            json: {
                note,
                uses
            }
        }).json<Invitation>()

        debug('called the api, created this invitation::', inv)

        state.myInvitations.value = (state.myInvitations.value || []).concat([inv])
    } catch (_err) {
        const err = _err as HTTPError
        debug('error creating the invitation...', await err.response.text())
    }
}

/**
 * Get a single-use token via email.
 */
State.LoginToken = async function (
    state:ReturnType<typeof State>,
    email:string,
):Promise<void> {
    const keys = await Keys.load()
    state.keys.value = keys
    ky = SignedRequest(Ky, keys.signKeypair, window.localStorage)

    const res = await ky.post('/api/login', {
        json: { email }
    }).json()

    debug('code login response', res)
}

State.acceptTokenLogin = async function () {

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
        debug('login success', res)
    } catch (_err) {
        const err = _err as HTTPError
        //
        // we are getting 401, which means we are not sending headers
        //
        if (err.response?.status !== 401) {
            // 401 means they are not a member of the site
            State.toast(state, 'error', err.toString())
        }
        debug('**login error**', err)
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
