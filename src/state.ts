import { type Signal, signal } from '@preact/signals'
import { Keys } from '@bicycle-codes/keys'
import ky from 'ky'
import Route from 'route-event'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Setup any state
 *   - routes
 *   - keys
 */
export function State ():{
    route:Signal<string>;
    keys:Signal<Keys|null>;
    _setRoute:(path:string)=>void;
} {  // eslint-disable-line indent
    const onRoute = Route()

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        keys: signal<Keys|null>(null),
        route: signal<string>(location.pathname + location.search)
    }

    Keys.load().then(keys => {
        // we are using the `keys` property to
        // know if they have an account or not
        if (keys.persisted) state.keys.value = keys
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

State.acceptInvitation = async function (
    state:ReturnType<typeof State>,
    invitationCode:string
) {
    debug('accept an invitation', invitationCode)
}
