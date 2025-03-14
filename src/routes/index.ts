import Router from '@substrate-system/routes'
import { HomeRoute } from './home.js'
import { AddRoute } from './add.js'
import { LinkRoute } from './link.js'
import { AcceptRoute } from './accept.js'

export default function _Router ():ReturnType<Router> {
    const router = new Router()

    router.addRoute('/', () => {
        return HomeRoute
    })

    router.addRoute('/add', () => {
        return AddRoute
    })

    router.addRoute('/link', () => {
        return LinkRoute
    })

    router.addRoute('/accept', () => {
        return AcceptRoute
    })

    return router
}
