export function getDbString (env:NodeJS.ProcessEnv):string {
    const envVar = env[`DATABASE_URL_${process.env.NODE_ENV?.toUpperCase()}`]!
    console.log('NODE_ENV', process.env.NODE_ENV)
    return envVar
}
