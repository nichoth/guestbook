export function getDbString (env:{ NODE_ENV, NEON_URL }):string {
    let envVar:string|undefined = env[`NEON_URL_${process.env.NODE_ENV?.toUpperCase()}`]
    if (envVar) return envVar

    envVar = env['NEON_URL']
    if (!envVar) throw new Error('Not DB URL')

    return envVar
}
