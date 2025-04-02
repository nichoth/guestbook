import { html } from 'htm/preact'
import type { HTTPError } from 'ky'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { State } from '../state/index.js'
import { useComputed, useSignal, useSignalEffect } from '@preact/signals'
import type { Machine, User } from '../types.js'
import { Dot } from '../components/dot.js'
import { Profile } from '../components/profile.js'
import '../components/dl.css'
import './whoami.css'
import { IconX } from '../components/icon-close-x.js'
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

    const editProfile = useCallback(async (user:User) => {
        debug('edit the profile', user)
        await State.updateProfile(state, user)
    }, [])

    const removeMachine = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        const machineName = (ev.currentTarget as HTMLButtonElement).dataset['machineid']
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
        <${Profile} user=${state.user.value} onEdit=${editProfile} />

        <h2>Your Devices</h2>
        <ul>
            ${state.machines.value?.map(machine => {
                const machineid = machine.machineName
                const isCurrent = (currentMachine.value === machineid)
                return html`<li key=${machineid}>
                    <div>
                        <${Dot} color=${isCurrent ? 'green' : 'gray'} />
                        <span>${machine.humanName}</span>
                        ${isCurrent ?
                            html`<span class="current-machine">
                                (the one you're using right now)
                            </span>` :
                            null
                        }
                    </div>
                    ${currentMachine.value === machine.machineName ?
                        null :
                        html`<div>
                            <sl-tooltip
                                content="Remove this machine"
                            >
                                <${IconX}
                                    data-machineid=${machineid}
                                    aria-label="Remove"
                                    name="x-circle"
                                    onClick=${removeMachine}
                                />
                            </sl-tooltip>
                        </div>`
                    }
                </li>`
            })}
        </ul>
    </div>`
}
