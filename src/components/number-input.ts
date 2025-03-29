import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import type { FunctionComponent } from 'preact'
import type { Signal } from '@preact/signals'
import '@nichoth/components/number-input.css'

interface Props {
    name:string;
    min:number;
    max:number;
    id?:string;
    class?:string;
    value:Signal<number>;
    onIncrease?:(ev:MouseEvent)=>any;
    onDecrease?:(ev:MouseEvent)=>any;
    onChange?:(ev:InputEvent)=>any;
}

export const NumberInput:FunctionComponent<Props> = function NumberInput (props) {
    const { id, name, min, max, onChange, value, onIncrease, onDecrease } = props
    const className = (props.class || '')
        .split(' ')
        .concat(['input-group-number'])
        .join(' ')

    const changer = useCallback((ev:InputEvent) => {
        if (onChange) {
            onChange(ev)
        } else {
            value.value = parseInt((ev.target as HTMLInputElement).value)
        }
    }, [])

    return (html`<div class="${className}">
        <input ...${props} type="number" inputMode="numeric"
            pattern="[0-9]*"
            id=${id}
            max=${max}
            min=${min}
            onChange=${changer}
            value=${value.value}
            name=${name}
        />

        <div class="number-nav">
            <div class="number-button number-up">
                <button onClick=${ev => {
                    ev.preventDefault()
                    if (value.value >= max) {
                        value.value = max
                        return onIncrease && onIncrease(ev)
                    }
                    value.value = value.value + 1
                    onIncrease && onIncrease(ev)
                }}>+</button>
            </div>

            <div class="number-button number-down">
                <button onClick=${ev => {
                    ev.preventDefault()
                    if (value.value <= min) {
                        value.value = min
                        return onDecrease && onDecrease(ev)
                    }
                    value.value = value.value - 1
                    onDecrease && onDecrease(ev)
                }}>-</button>
            </div>
        </div>
    </div>`)
}
