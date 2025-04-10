import { html } from 'htm/preact'
import type { HTTPError } from 'ky'
import { useCallback } from 'preact/hooks'
import { type FunctionComponent } from 'preact'
import { State } from '../state/index.js'
import {
    useComputed,
    useSignal,
    useSignalEffect,
    batch,
    type Signal
} from '@preact/signals'
import type { Machine, User } from '../types.js'
import { Dot } from '../components/dot.js'
import { Profile } from '../components/profile.js'
import { BtnEditSquare } from '../components/button-edit-square.js'
import '../components/dl.css'
import './whoami.css'
import { IconX } from '../components/icon-close-x.js'
import { BtnSaveCloud } from '../components/button-save.js'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Route that shows your identity.
 */
export const WhoamiRoute:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const user = state.user.value
    const errorSignal = useSignal<null|string>(null)
    const editing = useSignal<null|string>(null)
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

    const updateProfile = useCallback(async (user:User) => {
        debug('edit the profile', user)
        await State.updateProfile(state, user)
    }, [])

    return html`<div class="route whoami">
        <h2>Who am I?</h2>
        <${Profile}
            isMe=${true}
            user=${state.user.value}
            onEdit=${updateProfile}
        />

        <h2>Your Devices</h2>
        <ul>
            ${state.machines.value?.map(machine => {
                return html`<${MachineRecord}
                    state=${state}
                    machine=${machine}
                    errorSignal=${errorSignal}
                    editing=${editing}
                />`
            })}
        </ul>

        ${errorSignal.value ?
            html`<div class="error">${errorSignal.value}</div>` :
            null
        }
    </div>`
}

function MachineRecord ({ state, machine, errorSignal, editing }:{
    state:ReturnType<typeof State>;
    machine:Machine;
    errorSignal:Signal<string|null>;
    editing:Signal<string|null>
}) {
    const resolving = useSignal<null|undefined|string>(null)
    const currentMachine = useSignal<null|string>(null)
    const machineid = machine.machineName
    const isCurrent = (currentMachine.value === machineid)
    const classes = (['machine'] as (string|null)[]).concat([
        resolving.value === machineid ? 'resolving' : null
    ]).filter(Boolean).join(' ')

    const machinesByName = useComputed<null|Record<string, Machine>>(() => {
        if (!state.machines.value) return null
        return state.machines.value.reduce((acc, machine) => {
            acc[machine.machineName] = machine
            return acc
        }, {})
    })

    useSignalEffect(() => {
        if (!state.keys.value) return
        (async () => {
            if (!state.keys.value) return
            const name = await state.keys.value.deviceName
            currentMachine.value = name
        })()
    })

    const removeMachine = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        const machineName = (ev.currentTarget as HTMLButtonElement)
            .dataset['machineid']
        const machine = machinesByName.value![machineName!]

        try {
            resolving.value = machine.machineName
            await State.removeMachine(state, machine)
        } catch (_err) {
            const err = _err as HTTPError
            errorSignal.value = err.message
            debug('error', err)
        } finally {
            resolving.value = null
        }
    }, [])

    // use the onFocus event to hightlight text

    const postUpdate = useCallback(async (ev:MouseEvent) => {
        // call the API
        ev.preventDefault()
        const btn = ev.currentTarget as HTMLButtonElement
        const data = btn.dataset
        const machineName = data.machineid
        const machine = machinesByName.value![machineName!]
        const newValue = (document.getElementById('new-machine-name') as HTMLInputElement)
        const humanName = newValue.value
        resolving.value = machineName
        try {
            await State.editMachine(state, {
                ...machine,
                humanName
            })

            batch(() => {
                editing.value = null
                resolving.value = null
            })
        } catch (_err) {
            // show non-200 reponses
            const err = _err as HTTPError
            batch(async () => {
                errorSignal.value = await err.response.text()
                resolving.value = null
            })
        }
    }, [])

    const cancelEdit = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        editing.value = null
    }, [])

    const editMachine = useCallback((ev:MouseEvent) => {
        // change the UI state
        ev.preventDefault()
        const btn = ev.currentTarget as HTMLButtonElement
        const data = btn.dataset
        const machineName = data.machineid
        const machine = machinesByName.value![machineName!]
        editing.value = machine.machineName
    }, [])

    return html`<li key=${machineid} class="${classes}">
        <div>
            <${Dot} color=${isCurrent ? 'green' : 'gray'} />
            ${
                // editing ? show an input
                (editing.value && editing.value === machine.machineName) ?
                html`
                    <input
                        id="new-machine-name"
                        autofocus=${true}
                        type="text"
                        class="inline"
                        defaultValue=${machine.humanName}
                    />
                ` :
                // else, show the name
                html`
                    <span>${machine.humanName}</span>
                    ${isCurrent ?
                        html`<span class="current-machine">
                            (the one you're using right now)
                        </span>` :
                        null
                    }
                `
            }
        </div>

        <!-- controls -->

        ${currentMachine.value === machine.machineName ?
            // is current machine
            // no delete button
            html`<div class="machine-controls">
                ${(editing.value && editing.value === machine.machineName) ?
                    // are we editing? show save button
                    html`
                        <sl-tooltip content="Save machine name">
                            <${BtnSaveCloud}
                                onClick=${postUpdate}
                                aria-label="Save"
                                data-machineid=${machineid}
                            />
                        </sl-tooltip>

                        <sl-tooltip content="Cancel">
                            <${IconX}
                                class="cancel"
                                data-machineid=${machineid}
                                aria-label="Remove"
                                name="x-circle"
                                onClick=${cancelEdit}
                            />
                        </sl-tooltip>
                    ` :

                    // else, show edit button
                    html`
                        <sl-tooltip content="Edit machine name">
                            <${BtnEditSquare}
                                data-machineid=${machineid}
                                aria-label="Edit"
                                onClick=${editMachine}
                            />
                        </sl-tooltip>
                    `
                }
            </div>` :

            // not current machine
            // edit button and delete button
            html`<div>
                    ${(editing.value && editing.value === machine.machineName) ?
                        // are we editing? show save button
                        html`
                            <sl-tooltip content="Save machine name">
                                <${BtnSaveCloud}
                                    onClick=${postUpdate}
                                    aria-label="Save"
                                    data-machineid=${machineid}
                                />
                            </sl-tooltip>
                            <sl-tooltip content="Cancel">
                                <${IconX}
                                    class="cancel"
                                    data-machineid=${machineid}
                                    aria-label="Cancel edit"
                                    name="x-circle"
                                    onClick=${cancelEdit}
                                />
                            </sl-tooltip>
                        ` :
                        // else, show edit button
                        html`<sl-tooltip content="Edit machine name">
                            <${BtnEditSquare}
                                title=${''}
                                data-machineid=${machineid}
                                aria-label="Edit"
                                onClick=${editMachine}
                            />
                        </sl-tooltip>`
                    }

                    ${editing.value === machine.machineName ?
                        null :
                        html`<sl-tooltip content="Remove this machine">
                            <${IconX}
                                data-machineid=${machineid}
                                aria-label="Remove"
                                name="x-circle"
                                onClick=${removeMachine}
                            />
                        </sl-tooltip>`
                    }
            </div>`
        }
    </li>`
}
