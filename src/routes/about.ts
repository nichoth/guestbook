import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { NBSP, EM_DASH } from '@substrate-system/util/constants'
import './about.css'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

/**
 * The colophon
 */
export const AboutRoute:FunctionComponent<{ state, splats }> = function (_props) {
    return html`<div class="route about">
        <h1>The Colophon</h1>
        
        <p>How does it work?</p>

        <p>
            This website is a <a href="https://developer.mozilla.org/en-US/docs/Glossary/SPA">
                single page application</a>.
            The words you are reading were rendered by${NBSP}
            <a href="https://preactjs.com/">preact</a>, using${NBSP}
            <a href="https://preactjs.com/blog/introducing-signals/">signals</a>
            ${NBSP}for state, and <a href="https://github.com/developit/htm">
            <code>htm</code></a> as a template language. The site was created${NBSP}
            <a href="https://github.com/nichoth/template-netlify-app">
                from this template repo</a>.
        </p>

        <p>
            The backend is <a href="https://www.netlify.com/platform/core/functions/">
            lambda functions, hosted by netlify</a>, and a database from${NBSP}
            <a href="https://neon.tech/">Neon DB</a>.
        </p>

        <p>
            We do some input validation with <a href="https://zod.dev/">zod</a>.
        </p>

        <p>
            Some of the UI components are from <a href="https://shoelace.style/">
            shoelace</a>, and some are <a href="https://github.com/nichoth/components">
            my own</a>.
        </p>

        <h2 id="identity">Identity</h2>
        <p>
            This site has a concept of <em>who you are</em>, which we use
            for access control. The content on this site is only visible to
            other members of the site. To become a member, you must be
            invited by someone who is already a member.
        </p>

        <p>
            That is the trust level to keep in mind when you use this.
            You are trusting the other
            people at <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://innovatebellingham.org/"
            >Innovate Bellingham</a> not to give out memberships to spam
            companies, etc.
        </p>

        <h2 id="keys">Keys</h2>
        <p>
            Your identity is handled by${NBSP}
            <a href="https://github.com/bicycle-codes/keys">
                <code>@bicycle-codes/keys</code>
            </a>, a library that saves a <a href="https://developer.mozilla.org/en-US/docs/Web/API/CryptoKeyPair">
            set of keys</a> to <code>
            indexedDB</code> in your browser.
        </p>

        <p>
            This is a demonstration of an auth system I first saw used by${NBSP}
            <a href="https://github.com/fission-codes">Fission</a>, with${NBSP}
            <a href="https://github.com/ucan-wg/ts-ucan">UCAN</a> tokens.
        </p>

        <p>
            The idea is that you have at least one machine that is always${NBSP}
            "logged in". Logged in, in this context, just means that the browser
            has a keypair that is authorized by the server.
        </p>

        <p>
            To use a different machine, you authorize a new keypair owned by
            that machine. The new keypair can be time restricted, or have
            different, more granular permissions.
        </p>

        <h2 id="passwords">Passwords</h2>

        <p>
            Some good news is that there are no passwords in this system.
            You have a set of <a href="https://developer.mozilla.org/en-US/docs/Web/API/CryptoKeyPair">
            keys</a>, which are saved as <a href="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey#extractable">
            "non-extractable"</a> keypairs in your browser. This eliminates
            a security vector ${EM_DASH} there are no passwords to think about.
        </p>

        <p>
            Something to keep in mind is that <strong>your web browser is the
            only place where your keys exist</strong>. So if you do something like
            delete your browser data, then your keys disappear too.
        </p>

        <p>
            I recommend <a href="/link">linking a second device</a> to
            your account, so that there is a backup if one browser deletes
            your keys.
        </p>

        <p>
            A good practice is to have a phone type device (something portable)
            that is always logged in. That way, if you need to use a different
            machine, like say a public library terminal, you can use your phone
            to authorize the new machine for a limited time.
        </p>

        <h2 id="auth">Auth</h2>
        <p>
            Since there are no passwords, we use <a href="https://github.com/bicycle-codes/request">
            a library called request</a> to sign all HTTP calls.
        </p>

        <h2 id="ucan">UCAN</h2>
        <p>
            The idea of UCANs ${EM_DASH} a token signed by an existing device
            ${NBSP}${EM_DASH} is demonstrated here, but it's not really necessary for
            this usecase.
        </p>

        <p>
            Since this is a traditional, server-based application, we can have
            some convenient things, like for example you are able to login
            via a single-use link in an email. 
        </p>

        <h2 id="membership">Membership</h2>
        <p>
            We avoid <em>spam</em> by restricting access to only
            members of the website. So you need to be a member in order to read
            the contact list.
        </p>

        <p>
            Who is a member? This follows the country
            club system ${EM_DASH} you have to be invited by someone who is
            already a member.
        </p>

        <p>
            An invitation is a record in a database containing a${NBSP}
            <a href="https://github.com/uuidjs/uuid">universllay unique ID</a>,
            created by an existing member. The existing member
            must give you the invitation code out-of-band from this website.
        </p>

        <h2 id="contact">Contact</h2>
        <p>
            This website was made by <a href="https://nichoth.com/">nichoth</a>,
            for <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://innovatebellingham.org/"
            >the Bellingham meetings</a>.
        </p>

        <ul>
            <li>
                <a href="mailto:nichoth@bicycle.codes">nichoth@bicycle.codes</a>
            </li>
            <li><a
                target="_blank"
                rel="noopener noreferrer"
                href="https://nichoth.com/"
            >nichoth.com</a></li>
            <li>
                <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://bsky.app/profile/nichoth.com"
                >bsky.app/nichoth</a>
            </li>
        </ul>
    </div>`
}
