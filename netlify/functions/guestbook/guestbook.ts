import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { Octokit } from '@octokit/core'
// import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
// import { writeFileSync } from 'node:fs'

// writeFileSync('./package.json', JSON.stringify({ version: '0.0.0' }))

// eslint-disable-next-line
// import { $ } from 'zx'

export const handler:Handler = async function handler (
    ev:HandlerEvent,
    // ctx:HandlerContext
) {
    console.log('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
    if (ev.httpMethod !== 'GET' && ev.httpMethod !== 'POST') {
        return { statusCode: 405 }
    }

    if (ev.httpMethod === 'GET') {
        // get the guestbook

        return {
            statusCode: 200,
            body: JSON.stringify({ hello: 'hello' })
        }
    }

    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

    /**
     * method is POST
     *   - make a PR to the github repo
     */

    // parse the incoming request
    if (!ev.body) return { statusCode: 400 }
    const data:{
        username:string,
        body:string,
        email:string
    } = JSON.parse(ev.body)

    console.log('parsed request...', data)

    const { username, body, email } = data
    if (username.length > 100) {
        return { statusCode: 413 }
    }
    if (body.length > 6000) {
        return { statusCode: 413 }
    }

    // for git, no spaces
    const gitName = username.split(' ').filter(Boolean).join('_')

    if (!gitName) {
        return { statusCode: 401 }
    }

    // we are assuming the git repo is setup already

    // update local repo
    await writeFile(`./data/${gitName}.md`, `# ${username}

## email
${email}

-------

${body}
`
    )

    // const child = spawn('git config user.email "innovatebellingham.proton.me"')
    // const childPromise = new Promise((resolve, reject) => {
    //     child.once('close', code => {
    //         console.log('*** closed ***')

    //         if (code === 0) {
    //             console.log('all good')
    //             resolve(0)
    //         } else {
    //             console.log('oh no...', code)
    //             reject(new Error('code ' + code))
    //         }
    //     })

    //     child.once('error', err => {
    //         console.log('caught this error....', err)
    //     })
    // })

    // try {
    //     await childPromise
    // } catch (err) {
    //     console.log('caught an error', err)
    //     return { statusCode: 500, body: 'woops' }
    // }

    // commit and push
    // await $`
    //     git config user.email "innovatebellingham@proton.me"
    //     git config user.name "netlify script"
    //     git checkout -b addition-${gitName}
    //     git add .
    //     git commit -m 'Add a new contact'
    //     git push origin $addition-${gitName} -o ci.skip
    // `

    const octokit = new Octokit({
        auth: process.env.GH_KEY
    })

    await octokit.request('PUT /repos/nichoth/bellingham-guestbook/contents/data/testing.md', {
        owner: 'nichoth',
        repo: 'bellingham-guestbook',
        path: 'data/testing.md',
        message: 'my commit message',
        committer: {
            name: 'Monalisa Octocat',
            email: 'octocat@github.com'
        },
        content: 'bXkgbmV3IGZpbGUgY29udGVudHM=',
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    // add the content

    // make a PR
    // await octokit.request('POST /repos/nichoth/bellingham-guestbook/pulls', {
    //     owner: 'nichoth',
    //     repo: 'bellingham-guestbook',
    //     title: 'Add a contact',
    //     body: `Adding ${username} to the guestbook.`,
    //     head: `bellingham-guestbook:addition-${gitName}`,
    //     base: 'main',
    //     headers: {
    //         'X-GitHub-Api-Version': '2022-11-28'
    //     }
    // })

    return {
        statusCode: 200,
        body: JSON.stringify({ hello: 'hello' })
    }
}
