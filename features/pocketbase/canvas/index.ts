import { connection } from "./connection"
import { profile } from "./profile"
import { ref } from "./ref"
import { Contract, DeriveModelTypes, ModelSchema } from "@canvas-js/core"

export const models = {
  connection,
  profile,
  ref,
} as const satisfies ModelSchema

export type ModelTypes = DeriveModelTypes<typeof models>

export default class Refs extends Contract<typeof Refs.models> {
  static models = {
    connection,
    profile,
    ref,
  } satisfies ModelSchema
}
