import { type DID } from '@bicycle-codes/keys'

export type User = {
    email:string;
    username:string;
    body:string;
}

export type Machine = {
    did:DID;
    humanName:string;
}

export type Invitation = {
    note:string;
    ts:{
        isoString:string;
    };
    code:string;
    creator:{
        id:string;
        username:string;
        humanName:string;
    }
}
