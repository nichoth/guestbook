import { html } from 'htm/preact'
import { type FunctionComponent, render } from 'preact'
// import ky from 'ky'
import { State } from './state.js'
import Router from './routes/index.js'
import '@substrate-system/css-normalize'
import './style.css'
// import { createDebug } from '@substrate-system/debug'
// const debug = createDebug()

const router = Router()
const state = State()

if (import.meta.env.DEV || import.meta.env.MODE === 'staging') {
    // @ts-expect-error DEV env
    window.state = state
}

// example of calling our API
// const json = await ky.get('/api/example').json()
// const json = await ky.post('/api/guestbook', {
//     json: {
//         username: 'abc',
//         email: 'abc@123.com',
//         body: `
//             hello world

//             * [github](https://github.com/nichoth/)
//             * [nichoth.com](https://nichoth.com/)
//         `
//     }
// }).json()

// debug('the json response', json)

export const Guestbook:FunctionComponent = function Example () {
    const match = router.match(state.route.value)
    const ChildNode = match.action(match, state.route)

    if (!match) {
        return html`<div class="404">
            <h1>404</h1>
        </div>`
    }

    return html`<div>
        <h1>Bellingham Guestbook</h1>
        <p>
            A guestbook for <a href="https://innovatebellingham.org/">
                Innovate Bellingham
            </a>
        </p>

        <${ChildNode} state=${state} />
    </div>`
}

render(html`<${Guestbook} />`, document.getElementById('root')!)
