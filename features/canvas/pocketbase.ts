import Pocketbase from 'pocketbase'

export const pocketbase = new Pocketbase('https://refs.enabler.space')
pocketbase.autoCancellation(false)
