import Router from '@substrate-system/routes'
import { HomeRoute } from './home.js'
import { AddRoute } from './add.js'
import { LinkRoute } from './link.js'
import { AcceptRoute } from './accept.js'
import { LostRoute } from './lost.js'
import type { State } from '../state.js'
import { AboutRoute } from './about.js'

export default function _Router (state:ReturnType<typeof State>):Router {
    const router:Router = new Router()

    router.addRoute('/', () => {
        return HomeRoute
    })

    router.addRoute('/lost', () => {
        return LostRoute
    })

    router.addRoute('/add', () => {
        return AddRoute
    })

    router.addRoute('/link', () => {
        return LinkRoute
    })

    router.addRoute('/accept/:token', () => {
        if (state.user.value) return state._setRoute('/')
        return AcceptRoute
    })

    router.addRoute('/accept', () => {
        if (state.user.value) return state._setRoute('/')
        return AcceptRoute
    })

    router.addRoute('/about', () => {
        return AboutRoute
    })

    return router
}
