import Router from '@substrate-system/routes'
import { HomeRoute } from './home.js'
import { LinkRoute } from './link.js'
import { AcceptRoute } from './accept.js'
import { LostRoute } from './lost.js'
import { State } from '../state/index.js'
import { AboutRoute } from './about.js'
import { ListRoute } from './list.js'
import { WhoamiRoute } from './whoami.js'
import { InvitationRoute } from './invitations.js'
import { CreateInvitationRoute } from './invitations_create.js'
import { LinkNewDeviceRoute } from './link-new-device.js'
import { InvitationByCode } from './invitations_code.js'
import { HTTPError } from 'ky'
import { UsernameRoute } from './username.js'
import { when } from '../util.js'
import { LoginRoute } from './login.js'
import Debug from '@substrate-system/debug'
import { LoginAccept } from './login_accept.js'
const debug = Debug()

/**
 * We call router.match every time the index view re-renders.
 * Should debounce the fetch calls in `State`. That way we can just
 * call functions here and not care about other renders.
 */
export default function _Router (state:ReturnType<typeof State>):Router {
    const router:Router = new Router()

    router.addRoute('/', () => {
        return HomeRoute
    })

    router.addRoute('/whoami', () => {
        return WhoamiRoute
    })

    router.addRoute('/lost', () => {
        return LostRoute
    })

    router.addRoute('/link', () => {
        return LinkRoute
    })

    /**
     * New device visits this route.
     */
    router.addRoute('/link/:code', () => {
        return LinkNewDeviceRoute
    })

    router.addRoute('/accept/:token', () => {
        if (state.user.value) return state._setRoute('/')
        return AcceptRoute
    })

    router.addRoute('/accept', () => {
        return AcceptRoute
    })

    router.addRoute('/about', () => {
        return AboutRoute
    })

    router.addRoute('/list', () => {
        if (!state.user.value) return ListRoute
        State.fetchList(state)

        return ListRoute
    })

    router.addRoute('/login', () => {
        return LoginRoute
    })

    router.addRoute('/login/:code', () => {
        return LoginAccept
    })

    router.addRoute('/contact/:username', (match:{ params: { username:string }}) => {
        // fetch the user if we don't have them already
        const name = match.params.username.trim()
        const list = state.list.value
        const user = list?.find((item) => {
            return item.username === name
        })

        if (user) return UsernameRoute

        // else, query the DB
        when(state.user, async () => {
            State.fetchUser(state, name)
        })

        return UsernameRoute
    })

    router.addRoute('/invitations', () => {
        State.fetchMyInvitations(state)
        return InvitationRoute
    })

    router.addRoute('/invitations/create', () => {
        State.fetchMyInvitations(state)
        return CreateInvitationRoute
    })

    /**
     * This route is only for viewing your invitations.
     * Accepting an invitation is a route like `/accept/:code`
     */
    router.addRoute('/invitations/:code', (match:{ params: { code }}) => {
        const foundInvitation = (
            state.myInvitations.value &&
            state.myInvitations.value.find(inv => {
                return inv.code === match.params.code
            })
        )

        if (!foundInvitation) {
            // fetch the invitation if it doesn't exist
            State.fetchInvitation(state, match.params.code)
                .catch(async err => {
                    if (err instanceof HTTPError) {
                        state.error.value = {
                            code: err.response.status,
                            message: await err.response.text()
                        }
                    } else {
                        debug('**unhandled error**', err)
                    }
                })
        }

        return InvitationByCode
    })

    return router
}
