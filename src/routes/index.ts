import Router from '@substrate-system/routes'
import { HomeRoute } from './home.js'
import { LinkRoute } from './link.js'
import { AcceptRoute } from './accept.js'
import { LostRoute } from './lost.js'
import { State } from '../state.js'
import { AboutRoute } from './about.js'
import { ListRoute } from './list.js'
import { WhoamiRoute } from './whoami.js'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

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

    return router
}
