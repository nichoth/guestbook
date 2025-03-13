import { $ } from 'zx'

const res = await $`
    mkdir -p data
    echo "hello" > data/test.txt
    git status
`

console.log('**res**', res.stdout)
