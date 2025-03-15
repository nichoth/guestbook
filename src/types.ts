import { type DID } from '@bicycle-codes/keys'

export type User = {
    email:string;
    username:string;
}

export type Machine = {
    did:DID,
    humanName:string
}
