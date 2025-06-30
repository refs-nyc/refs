# Refs Protocol

The Refs protocol (`refproto`) is a protocol for social discovery, that powers a public phonebook for the internet.

It provides a data store where people can save and edit a list of personal interests, browse and search for people, and search the latent space around them.

## Interest Graph

### Refs

A `Ref` is a saved item on the Refs interest graph. Each ref can be saved with arbitrary metadata, including
location and type (e.g. indicating that a ref is a book, location, artwork).

Refs might include places of interest, locations, restaurants and bars, activities, books, movies, authors, general interests, or aspects of personal identity.

Refs may be created by anyone, and may not be deleted. A later version of the protocol might allow refs to be garbage-collected.

<<< @/../features/pocketbase/canvas/ref.ts

### Connections

A `Connection` is a link between a `Profile` and `Ref`, created by the owner of the Profile.

Connections store user-specific metadata about a ref, including a copy of the name of the Ref, any description that the user chooses to set on their profile, and the `order` in which the ref should be displayed on their profile.

Connections may have the `backlog` boolean flag set, in which case the connection should be displayed in an archive of the

Connections may have `children`, which are other Connection objects. If a connection has children, clients should render the parent Connection as a list.

<<< @/../features/pocketbase/canvas/connection.ts

### Profiles

A `Profile` is a canonical representation of a person on the Refs protocol.

Each profile can only be edited by the DID declared as the creator of the profile.

<<< @/../features/pocketbase/canvas/profile.ts

## Authentication

In the first version of the Refs protocol, users log into the protocol with Ethereum addresses using the Sign In With Ethereum (SIWE) standard.

Users are represented as `did:pkh` decentralized identities, which allow Ethereum addresses to be [translated to a DID document](https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md) controlled by the address's private key.

Later versions of the protocol might allow profiles to delegate additional DIDs as authorized editors, for cross-device compatibility, e.g. with iCloud to sync passkeys. In the meantime, developers are expected to use a hosted DID like Privy to provide accounts across devices.

### Authorization

Currently there is only one authorization scope for Refs; users may log in to Refs account by requesting a session key, which delegates an ed25519 `did:key` identifier to create and update connections, refs, and profiles.

Later versions of the protocol will allow users to delegate the ability to create or edit limited amounts of data in their personal storage to miniapps and extensions attached to the Refs protocol.