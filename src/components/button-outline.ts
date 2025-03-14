import { html } from 'htm/preact'
import type { FunctionComponent } from 'preact'
import type { Signal } from '@preact/signals'
import { useSignal } from '@preact/signals'
import './button-outline.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

type BtnProps = {
    isSpinning?:Signal<boolean>;
    type?:'submit'|'reset'|'button';
    class?:string;
    disabled?:string;
    onClick?:(ev:MouseEvent)=>Promise<any>;
}

export const Btn:FunctionComponent<BtnProps> = function Btn (props) {
    const classes = new Set(props.class ? props.class.split(' ') : [])
    classes.add('btn-outline')
    const isSpinning:Signal<boolean> = (props.isSpinning ?
        props.isSpinning :
        useSignal(false)
    )

    if (isSpinning.value) {
        classes.add('spinning')
    }

    return html`<button ...${props} class="${Array.from(classes).join(' ')}">
        <span class="btn-content">
            ${props.children}
        </span>
    </button>`
}

export const Primary:FunctionComponent<BtnProps> = function (props) {
    let { isSpinning } = props
    if (!isSpinning) isSpinning = useSignal(false)

    const classes = ([
        'btn-outline',
        'primary',
        props.class,
        isSpinning.value ? 'spinning' : ''
    ]).filter(Boolean).join(' ').trim()

    async function click (ev:MouseEvent) {
        if (props.onClick) {
            isSpinning!.value = true
            await props.onClick(ev)
            isSpinning!.value = false
        }
    }

    return html`<${Btn}
        ...${props}
        class=${classes}
        disabled=${props.disabled || isSpinning.value}
        onClick=${click}
    >
        ${props.children}
    <//>`
}

export const Danger:FunctionComponent<BtnProps> = function (props) {
    let { isSpinning } = props
    if (!isSpinning) isSpinning = useSignal(false)

    async function click (ev:MouseEvent) {
        if (props.onClick) {
            isSpinning!.value = true
            await props.onClick(ev)
            isSpinning!.value = false
        }
    }

    const classes = ([
        'btn-outline',
        'danger',
        props.class,
        isSpinning.value ? 'spinning' : ''
    ]).filter(Boolean).join(' ').trim()

    return html`<${Btn}
        ...${props}
        class=${classes}
        disabled=${props.disabled || isSpinning.value}
        onClick=${click}
    >
        ${props.children}
    <//>`
}
