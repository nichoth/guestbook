export function getDbString (env:NodeJS.ProcessEnv):string {
    let envVar:string|undefined = env[`NEON_URL_${process.env.NODE_ENV?.toUpperCase()}`]
    if (envVar) return envVar

    envVar = env['NEON_URL']
    if (!envVar) throw new Error('Not DB URL')

    return envVar
}

export function sanitizeHeader (seq:number, author:string) {
    try {
        return (author.length < 450 && seq < Number.MAX_SAFE_INTEGER)
    } catch (_err) {
        return false
    }
}
