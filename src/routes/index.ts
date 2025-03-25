import Router from '@substrate-system/routes'
import { HomeRoute } from './home.js'
import { LinkRoute } from './link.js'
import { AcceptRoute } from './accept.js'
import { LostRoute } from './lost.js'
import type { State } from '../state.js'
import { AboutRoute } from './about.js'
import { ListRoute } from './list.js'
import { WhoamiRoute } from './whoami.js'

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
        return ListRoute
    })

    return router
}
