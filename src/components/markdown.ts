import { type FunctionComponent } from 'preact'
import { html } from 'htm/preact'
import Markup from 'preact-markup'
import { marked } from 'marked'

export const Markdown:FunctionComponent<{
    markdown:string
}> = function Markdown (props) {
    const { markdown } = props

    return html`<${Markup}
        markup=${marked(markdown)}
        trim=${false}
        type="html"
    />`
}
