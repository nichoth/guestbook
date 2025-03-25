import { type DID } from '@bicycle-codes/keys'

export type User = {
    username:string;
    humanName:string;
    email:string;
    body:string;
    bluesky:string;
}

export type Contact = {
    humanName:string;
    email:string;
    body:string;
}

export type Machine = {
    did:DID;
    machineName:string;
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
