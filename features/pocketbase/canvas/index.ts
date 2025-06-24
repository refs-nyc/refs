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
