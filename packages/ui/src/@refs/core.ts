export const prepareRef = (r: StagedRef): RefsItem =>
  ({
    ...r,
    id: `${Math.random()}`,
    createdAt: Date.now(),
  }) as RefsItem
