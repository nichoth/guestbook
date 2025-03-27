export function getDbString (env:NodeJS.ProcessEnv):string {
    console.log('**NODE_ENV**', process.env.NODE_ENV)
    const envVar = env[`DATABASE_URL_${process.env.NODE_ENV?.toUpperCase()}`]!
    console.log('NODE_ENV', process.env.NODE_ENV)
    console.log('**VAR**', envVar)
    return envVar
}

export function sanitizeHeader (seq:number, author:string) {
    return (author.length < 450 && seq < Number.MAX_SAFE_INTEGER)
}
