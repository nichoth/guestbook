import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { EditSquare, register } from '@substrate-system/icons/edit-square'
import { isRegistered } from '@substrate-system/web-component'

if (!isRegistered(EditSquare.TAG_NAME)) {
    register()
}

export const BtnEditSquare:FunctionComponent<{
    isResolving?:boolean;
    type?:'submit'|'reset'|'button';
    class?:string;
    disabled?:string;
    onClick?:(ev:MouseEvent)=>Promise<any>;
}> = function Btn (props) {
    const { isResolving } = props
    const classes = (['icon-btn',
        'btn-edit-square',
        isResolving ? 'resolving' : null]).filter(Boolean).join(' ')

    return html`<button
        class="${classes}"
        onClick=${props.onClick}
        disabled=${props.disabled}
    >
        <edit-square></edit-square>
    </button>`
}
