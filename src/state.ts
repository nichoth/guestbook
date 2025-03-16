import { type Signal, signal } from '@preact/signals'
import { Keys } from '@bicycle-codes/keys'
import Ky, { type KyInstance } from 'ky'
import Route from 'route-event'
import { SignedRequest } from '@bicycle-codes/request'
import type { User } from './types'
import Debug from '@substrate-system/debug'
const debug = Debug()

let ky:KyInstance

/**
 * Setup any state
 *   - routes
 *   - keys
 *   - user data
 */
export function State ():{
    route:Signal<string>;
    // `null` means we haven't contacted the server yet
    // `false` means we got a response, and this machine is not a user
    user:Signal<null|false|User>;
    keys:Signal<Keys|null>;
    _setRoute:(path:string)=>void;
} {  // eslint-disable-line indent
    const onRoute = Route()

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        keys: signal<Keys|null>(null),
        user: signal(null),
        route: signal<string>(location.pathname + location.search)
    }

    Keys.load().then(async keys => {
        state.keys.value = keys
        await keys.persist()
        ky = SignedRequest(Ky, keys.signKeypair, window.localStorage)
        State.init(state)
    })

    // if (navigator.storage && navigator.storage.persist) {
    //     navigator.storage.persist().then((persistent) => {
    //         console.log('persistent', persistent)
    //         if (persistent) {
    //             console.log('Storage will not be cleared except by explicit user action')
    //         } else {
    //             console.log('Storage may be cleared by the UA under storage pressure.')
    //         }
    //     })
    // }

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
 * Get your user data from the server.
 */
State.init = async function (state:ReturnType<typeof State>) {
    const data = await ky.post('/api/login').json<{ user:User|false }>()
    debug('the user', data.user)

    if (!data.user) {
        state.user.value = false
        return
    }

    state.user.value = data.user
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
) {
    debug('fetching invitation', invitationCode)
    const res = await ky.get('/api/invitation', {
        searchParams: { code: invitationCode }
    }).json<{ code, ts, creator }>()

    return res
}

State.acceptInvitation = async function (
    state:ReturnType<typeof State>,
    invitationCode:string,
    userData:User
) {
    debug('accept the invitation', invitationCode)
    try {
        await ky.patch('/api/invitation', {
            json: {
                code: invitationCode,
                userData
            }
        })
        state._setRoute('/')
    } catch (err) {
        debug('error accepting the invitation', err)
        throw err
    }
}

State.Login = async function (
    state:ReturnType<typeof State>,
) {
    const keys = state.keys
    if (!keys) throw new Error('not keys')
    const userData = await ky.get('/api/login').json<{ user:User }>()
    debug('user data', userData)
    state.user.value = userData.user
}
