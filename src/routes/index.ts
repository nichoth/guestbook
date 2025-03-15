import Router from '@substrate-system/routes'
import { HomeRoute } from './home.js'
import { AddRoute } from './add.js'
import { LinkRoute } from './link.js'
import { AcceptRoute } from './accept.js'
import { LostRoute } from './lost.js'

export default function _Router ():Router {
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
        return AcceptRoute
    })

    router.addRoute('/accept', () => {
        return AcceptRoute
    })

    return router
}
