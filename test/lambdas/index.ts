import { test } from '@substrate-system/tapzero'
import ky, { type HTTPError } from 'ky'

const BASE_URL = 'http://localhost:9999/.netlify/functions'

test('call the API without headers', async t => {
    try {
        await ky.get(BASE_URL + '/login')
    } catch (_err) {
        const err = _err as HTTPError
        t.equal(err.response.status, 401, 'should return 401')
    }
})
