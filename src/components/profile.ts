import { type FunctionComponent } from 'preact'
import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { EditSquare, register } from '@substrate-system/icons/edit-square'
import '@substrate-system/icons/css'
import { IconX } from './icon-close-x.js'
import { useComputed, useSignal } from '@preact/signals'
import slugify from '@sindresorhus/slugify'
import { type HTTPError } from 'ky'
import { isRegistered } from '@substrate-system/web-component'
import { EM_DASH } from '@substrate-system/util/constants'
import { Markdown } from '../components/markdown.js'
import { Primary as BtnPrimary } from '../components/button-outline.js'
import type { User } from '../types'
import './profile.css'
import { BtnEditSquare } from './button-edit-square.js'
import Debug from '@substrate-system/debug'
const debug = Debug()

if (!isRegistered(EditSquare.TAG_NAME)) {
    register()
}

export const Profile:FunctionComponent<{
    user:User;
    context?:'list';
    onEdit?:(data:User)=>Promise<any>;
}> = function Profile (props) {
    const { user, context, onEdit } = props
    const isEditing = useSignal<boolean>(false)
    const isResolving = useSignal<boolean>(false)

    const pendingEdits = {
        humanName: useSignal(user.humanName),
        email: useSignal(user.email),
        bluesky: useSignal(user.bluesky),
        body: useSignal(user.body)
    }

    const hasEdit = useComputed<boolean>(() => {
        return Object.keys(pendingEdits).some(k => {
            return pendingEdits[k].value !== user[k]
        })
    })

    const handleSave = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        const newData = Object.keys(pendingEdits).reduce((acc, k) => {
            acc[k] = pendingEdits[k].value
            return acc
        }, {} as User)
        debug('the edited user data', newData)

        isResolving.value = true
        try {
            await (onEdit && onEdit(newData))
        } catch (_err) {
            const err = _err as HTTPError
            debug('the error', err)
            debug(err.response.status)
        }
        isResolving.value = false
    }, [])

    const handleEdit = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        isEditing.value = true
    }, [])

    const slugName = useSignal<string>(user.username)

    const handleInput = useCallback((ev:InputEvent) => {
        const el = ev.currentTarget as HTMLInputElement
        let name = el.getAttribute('name')!
        if (name.includes('-')) {
            // camelcase for property names
            name = name.split('-').map((word, i) => {
                if (i === 0) return word
                return word.charAt(0).toUpperCase() + word.slice(1)
            }).join('')
        }

        if (name === 'humanName') {
            // slugify it and show in the username field
            const slug = slugify(el.value, {
                separator: '_'
            })
            slugName.value = slug
        }

        pendingEdits[name].value = el.value
    }, [])

    const cancelEdit = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        isEditing.value = false
        Object.keys(pendingEdits).forEach((k) => {
            pendingEdits[k].value = user[k]
        })
    }, [])

    return html`<div class="component profile">
        ${onEdit ?
            html`
                <div class="controls">
                    ${isEditing.value ?
                        html`
                            <sl-tooltip content="Cancel edit">
                                <${IconX} onClick=${cancelEdit} />
                            </sl-tooltip>
                        ` :
                        html`
                            <sl-tooltip content="Edit your profile">
                                <${BtnEditSquare}
                                    onClick=${handleEdit}
                                    disabled=${isEditing.value}
                                />
                            </sl-tooltip>
                        `
                    }
                </div>
            ` :
            null
        }

        <dl>
            <dt>name</dt>
            <dd>
                ${isEditing.value ?
                    html`<input
                        name="human-name"
                        onInput=${handleInput}
                        value=${pendingEdits.humanName.value}
                        autofocus=${true}
                        type="text"
                    />` :
                    user.humanName
                }
            </dd>

            ${context === 'list' ?
                null :
                html`
                    <dt>username</dt>
                    <dd>${slugName}</dd>
                `
            }

            <dt>email</dt>
            <dd>
                ${props.context === 'list' ?
                    html`<a href="mailto:${user.email}">${user.email}</a>` :
                    (isEditing.value ?
                        html`
                            <input
                                onInput=${handleInput}
                                name="email"
                                type="email"
                                value=${pendingEdits.email.value}
                            />
                        ` :
                        html`<code>${user.email}</code>`
                    )
                }
            </dd>

            <dt>Bluesky</dt>
            <dd>
                ${isEditing.value ?
                    // if editing, then always show the input
                    html`<input
                        value=${pendingEdits.bluesky}
                        name="bluesky"
                        type="text"
                        onInput=${handleInput}
                    />` :
                    // not editing, so show the value
                    (user.bluesky ?
                        // either a link
                        html` <a href="https://bsky.app/profile/${user.bluesky}">
                            ${user.bluesky}
                        </a>
                        ` :
                        // or an em dash
                        EM_DASH)
                }
            </dd>

            <dt>note</dt>
            <dd class="note">
                ${isEditing.value ?
                    // always show an input if in edit mode
                    html`<textarea
                        name="body"
                        onInput=${handleInput}
                    >
                        ${pendingEdits.body}
                    </textarea>` :
                    // if not editing, then show the value
                    user.body ?
                        html`<div class="markdown">
                            <${Markdown} markdown=${user.body} />
                        </div>` :
                        html`<em class="none">none</em>`
                }
            </dd>
        </dl>

        ${isEditing.value ?
            html`<div class="controls">
                    <${BtnPrimary}
                        isSpinning=${isResolving}
                        disabled=${!hasEdit.value}
                        onClick=${handleSave}
                    >
                        Save
                    <//>
            </div>` :
            null
        }
    </div>`
}
