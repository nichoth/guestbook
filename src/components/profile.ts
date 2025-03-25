import { type FunctionComponent } from 'preact'
import { html } from 'htm/preact'
import { Markdown } from '../components/markdown.js'
import type { User } from '../types'
import './profile.css'

export const Profile:FunctionComponent<{
    user:User
}> = function Profile (props) {
    const { user } = props

    return html`<div class="component profile">
        <dl>
            <dt>name</dt>
            <dd>${user.username}</dd>
            <dt>email</dt>
            <dd>${user.email}</dd>
            <dt>note</dt>
            <dd class="note">
                ${user.body ?
                    html`<div class="markdown">
                        <${Markdown} markdown=${user.body} />
                    </div>` :
                    html`<em class="none">none</em>`
                }
            </dd>
        </dl>
    </div>`
}
