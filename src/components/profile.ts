import { type FunctionComponent } from 'preact'
import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { EditSquare, register } from '@substrate-system/icons/edit-square'
import '@substrate-system/icons/css'
import { isRegistered } from '@substrate-system/web-component'
import { Markdown } from '../components/markdown.js'
import type { User } from '../types'
import './profile.css'
import { EM_DASH } from '@substrate-system/util/constants'
import { BtnEditSquare } from './button-edit-square.js'

if (!isRegistered(EditSquare.TAG_NAME)) {
    register()
}

export const Profile:FunctionComponent<{
    user:User;
    context?:'list';
    onEdit?:(data:User)=>any;
}> = function Profile (props) {
    const { user, context, onEdit } = props

    const handleEdit = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        onEdit && onEdit(user)
    }, [])

    return html`<div class="component profile">
        ${onEdit ?
            html`
                <div class="controls">
                    <sl-tooltip content="Edit your profile">
                        <${BtnEditSquare} onClick=${handleEdit} />
                    </sl-tooltip>
                </div>
            ` :
            null
        }
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
                ${user.bluesky ?
                    html` <a href="https://bsky.app/profile/${user.bluesky}">
                        ${user.bluesky}
                    </a>` :
                    EM_DASH
                }
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
