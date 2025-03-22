export function getDbUrl ():string {
    const envVar = process.env[`DATABASE_URL_${process.env.NODE_ENV?.toUpperCase()}`]!
    return envVar
}
