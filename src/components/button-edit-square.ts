import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { EditSquare, register } from '@substrate-system/icons/edit-square'
import { isRegistered } from '@substrate-system/web-component'
import './button-edit-square.css'

if (!isRegistered(EditSquare.TAG_NAME)) {
    register()
}

export const BtnEditSquare:FunctionComponent<{
    isResolving?:boolean;
    type?:'submit'|'reset'|'button';
    class?:string;
    'aria-label'?:string;
    disabled?:string;
    onClick?:(ev:MouseEvent)=>Promise<any>;
}> = function Btn (props) {
    const { isResolving } = props
    const classes = (['icon-btn',
        'btn-edit-square',
        isResolving ? 'resolving' : null]).filter(Boolean).join(' ')

    return html`<button
        ...${props}
        aria-label=${props['aria-label'] || 'Edit'}
        class="${classes}"
        onClick=${props.onClick}
        disabled=${props.disabled}
    >
        <edit-square title="Edit"></edit-square>
        <span class="visually-hidden">Edit</span>
    </button>`
}
