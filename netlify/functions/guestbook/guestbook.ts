import type {
    Handler,
    HandlerEvent,
} from '@netlify/functions'
import { Octokit } from '@octokit/core'
import { REPO_NAME, REPO_OWNER } from '../constants.js'

export const handler:Handler = async function handler (
    ev:HandlerEvent,
) {
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

    const { username, body } = data
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

    const get = `GET /repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/main`
    console.log('getting things...', get)

    // get the sha for main
    const res = await octokit.request(get, {
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: 'heads/main',
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    const sha = res.data.object.sha
    console.log('shaaaaaaaaaaaaaaaaaaaaaa', sha)

    // create a new branch
    await octokit.request(`POST /repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
        owner: 'OWNER',
        repo: 'REPO',
        ref: `refs/heads/${gitName}`,
        sha,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    // add the content
    // create a new file, or update existing file
    const createRequest = (`PUT /repos/${REPO_OWNER}/${REPO_NAME}/contents/` +
        'data/testing.md')

    await octokit.request(createRequest, {
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: 'data/testing.md',
        message: 'my commit message',
        committer: {
            name: 'netlify script',
            email: 'innovatebellingham@proton.me'
        },
        content: Buffer.from(getFileContent(data)).toString('base64'),
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    return {
        statusCode: 200,
        body: JSON.stringify({ hello: 'hello' })
    }
}

function getFileContent (data:{ username, email, body }) {
    const { username, email, body } = data

    return `# ${username}

## email
${email}

-------

${body}
`
}
