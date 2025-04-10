import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { LogOut, register } from '@substrate-system/icons/log-out'
import { isRegistered } from '@substrate-system/web-component'
import './button-logout.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

if (!isRegistered(LogOut.TAG_NAME)) {
    register()
}

export const BtnLogout:FunctionComponent<{
    isResolving?:boolean;
    class?:string;
    disabled?:string;
    onClick?:(ev:MouseEvent)=>Promise<any>;
    title?:string;
}> = function Btn (_props) {
    const { isResolving, title, ...props } = _props
    const classes = ([
        'icon-btn',
        'btn-logout',
        isResolving ? 'resolving' : null
    ]).filter(Boolean).join(' ')

    const _title = title || 'Logout'

    return html`<button
        ...${props}
        aria-label=${props['aria-label'] || 'logout'}
        class="${classes}"
        onClick=${props.onClick}
        disabled=${props.disabled}
    >
        <log-out></log-out>
        <span class="visually-hidden">${_title}</span>
    </button>`
}
