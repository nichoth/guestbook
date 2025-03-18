import { html } from 'htm/preact'
import type { HTTPError } from 'ky'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { State } from '../state.js'
import { marked } from 'marked'
import { useComputed, useSignal, useSignalEffect } from '@preact/signals'
import type { Machine } from '../types.js'
import { Dot } from '../components/dot.js'
import '../components/dl.css'
import './whoami.css'
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Route that shows your identity.
 */
export const WhoamiRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const user = state.user.value
    if (!user) return null

    const currentMachine = useSignal<null|string>(null)
    useSignalEffect(() => {
        if (!state.keys.value) return
        (async () => {
            if (!state.keys.value) return
            const name = await state.keys.value.deviceName
            currentMachine.value = name
        })()
    })

    const machinesByName = useComputed<null|Record<string, Machine>>(() => {
        if (!state.machines.value) return null
        return state.machines.value.reduce((acc, machine) => {
            acc[machine.machineName] = machine
            return acc
        }, {})
    })

    const removeMachine = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        const machineName = (ev.target as HTMLButtonElement).dataset['machineid']
        const machine = machinesByName.value![machineName!]
        try {
            await State.removeMachine(state, machine)
        } catch (_err) {
            const err = _err as HTTPError
            debug('error', err)
        }
    }, [])

    return html`<div class="route whoami">
        <h2>Who am I?</h2>
        <div class="profile">
            <dl>
                <dt>name</dt>
                <dd>${user.username}</dd>
                <dt>email</dt>
                <dd>${user.email}</dd>
                <dt>note</dt>
                <dd class="note">
                    ${user.body ?
                        html`<div class="markdown">
                            ${marked.parse(user.body)}
                        </div>` :
                        html`<em class="none">none</em>`
                    }
                </dd>
            </dl>

            <h2>Your Devices</h2>
            <ul>
                ${state.machines.value?.map(machine => {
                    const machineid = machine.machineName
                    return html`<li key=${machineid}>
                        <div>
                            <${Dot} color="gray" />
                            <span>${machine.humanName}</span>
                                ${currentMachine.value === machine.machineName ?
                                    html`<span class="current-machine">
                                        (the one you're using right now)
                                    </span>` :
                                    null
                                }
                        </div>
                        ${currentMachine.value === machine.machineName ?
                            null :
                            html`<div>
                                <sl-icon-button
                                    onClick=${removeMachine}
                                    name="x-circle"
                                    label="Remove"
                                    data-machineid=${machineid}
                                >
                                </sl-icon-button>
                            </div>`
                        }
                    </li>`
                })}
            </ul>
        </div>
    </div>`
}
