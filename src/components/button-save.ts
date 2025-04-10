import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { SaveCloud, register } from '@substrate-system/icons/save-cloud'
import { isRegistered } from '@substrate-system/web-component'
import './button-save.css'

if (!isRegistered(SaveCloud.TAG_NAME)) {
    register()
}

export const BtnSaveCloud:FunctionComponent<{
    isResolving?:boolean;
    class?:string;
    disabled?:string;
    onClick?:(ev:MouseEvent)=>Promise<any>;
    title?:string;
}> = function Btn (_props) {
    const { isResolving, title: _title, ...props } = _props
    const classes = ([
        'icon-btn',
        'btn-save-cloud',
        isResolving ? 'resolving' : null
    ]).filter(Boolean).join(' ')

    const title = _title || 'Save'

    return html`<button
        ...${props}
        aria-label=${props['aria-label'] || 'Save'}
        class="${classes}"
        onClick=${props.onClick}
        disabled=${props.disabled}
    >
        <save-cloud title=${title}></save-cloud>
        <span class="visually-hidden">${title}</span>
    </button>`
}
