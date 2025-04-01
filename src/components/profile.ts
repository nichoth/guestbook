import { type FunctionComponent } from 'preact'
import { html } from 'htm/preact'
import { Markdown } from '../components/markdown.js'
import type { User } from '../types'
import './profile.css'

export const Profile:FunctionComponent<{
    user:User;
    context?:'list'
}> = function Profile (props) {
    const { user, context } = props

    return html`<div class="component profile">
        <dl>
            <dt>name</dt>
            <dd>${user.humanName}</dd>

            ${context === 'list' ?
                null :
                html`
                    <dt>username</dt>
                    <dd>${user.username}</dd>
                `
            }

            <dt>email</dt>
            <dd>${props.context === 'list' ?
                html`<a href="mailto:${user.email}">${user.email}</a>` :
                html`<code>${user.email}</code>`
            }</dd>

            <dt>Bluesky</dt>
            <dd>
                <a href="https://bsky.app/profile/${user.bluesky}">
                    ${user.bluesky}
                </a>
            </dd>

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
