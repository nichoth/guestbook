import Router from '@substrate-system/routes'
import { HomeRoute } from './home.js'

export default function _Router ():ReturnType<Router> {
    const router = new Router()

    router.addRoute('/', () => {
        return HomeRoute
    })

    return router
}
