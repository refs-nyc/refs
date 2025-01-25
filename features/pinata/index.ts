export type OptimizeImageOptions = {
  width: number
  height: number
}

import * as ImagePicker from 'expo-image-picker'

export const getPinataImage = async (url: string, imageOptions: OptimizeImageOptions) => {
  console.log(url)
  const cid = /files\/(.*)(?:\?)/g.exec(url)

  if (!cid?.[1] || !imageOptions?.width || !imageOptions?.height) return url

  const constructedUrl = `https://violet-fashionable-blackbird-836.mypinata.cloud/files/${cid[1]}?img-width=${imageOptions.width}&img-height=${imageOptions.height}`

  console.log(constructedUrl)

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_PIN_JWT}`,
      'Content-Type': 'application/json',
    },
    body: `{"url":"${constructedUrl}","expires":500000,"date":${Date.now()},"method":"GET"}`,
  }

  try {
    const response = await fetch('https://api.pinata.cloud/v3/files/sign', options)
    const result = await response.json()

    console.log(result.data)

    return result.data
  } catch (error) {
    console.error(error)
  }

  return url
}

/**
 * Create a signed pinata url
 */
export const pinataSignedUrl = async (cid: string) => {
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_PIN_JWT}`,
      'Content-Type': 'application/json',
    },
    body: `{"url":"https://violet-fashionable-blackbird-836.mypinata.cloud/files/${cid}","expires":500000,"date":${Date.now()},"method":"GET"}`,
  }

  try {
    const response = await fetch('https://api.pinata.cloud/v3/files/sign', options)
    return await response.json()
  } catch (error) {
    console.error(error)
  }
}

/**
 * Upload pinata
 *
 * @param asset
 * @returns
 */
export const pinataUpload = async (
  asset: ImagePicker.ImagePickerAsset,
  config: { prefix?: string } = { prefix: 'refs' }
): Promise<string> => {
  console.log('Called pinata with', asset)

  const form = new FormData()
  const fileName = `${config.prefix}-${Date.now()}`

  form.append('name', fileName)
  // TODO: uri isn't supposed to be on Blob?
  // @ts-ignore
  form.append('file', {
    uri: asset.uri,
    name: fileName,
    type: asset?.mimeType || 'image/jpeg',
  })

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_PIN_JWT}`,
      'Content-Type': 'multipart/form-data',
    },
    body: form,
  }

  try {
    const response = await fetch('https://uploads.pinata.cloud/v3/files', options)
    const result = await response.json()

    console.log(result)

    const { data: url } = await pinataSignedUrl(result.data.cid)

    return url
  } catch (error) {
    console.error(error)
    throw error
  }
}
