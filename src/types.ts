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
    seq:number;
    user:string;  // <-- the email of the user
}

export type ClientSideMachine = Omit<Machine, 'seq'>

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
