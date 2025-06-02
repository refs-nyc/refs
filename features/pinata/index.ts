import * as ImagePicker from 'expo-image-picker'

export type OptimizeImageOptions = {
  width: number
  height: number
}

export const constructPinataUrl = (url: string, imageOptions: OptimizeImageOptions) => {
  const cid = /files\/(.*)(?:\?)/g.exec(url)

  if (!cid?.[1] || !imageOptions?.width || !imageOptions?.height) return url

  return `https://violet-fashionable-blackbird-836.mypinata.cloud/files/${cid[1]}?img-width=${imageOptions.width}&img-height=${imageOptions.height}`
}

/**
 * Create a signed pinata url
 */

export type SignedUrlEntry = { expires: number; date: number; signedUrl: string }

export async function pinataSignedUrl(url: string): Promise<SignedUrlEntry> {
  const date = Date.now()
  const expires = 500000

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_PIN_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      expires,
      date,
      method: 'GET',
    }),
  }

  try {
    const response = await fetch('https://api.pinata.cloud/v3/files/sign', options)
    const value = await response.json()
    return { date, expires, signedUrl: value.data as string }
  } catch (error) {
    console.error(error)
    throw error
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
  const startTime = Date.now()
  console.log('🚀 Starting Pinata upload with asset:', asset)
  console.log('📝 Upload config:', config)
  console.log('⏱️ Upload started at:', new Date(startTime).toISOString())

  const form = new FormData()
  const fileName = `${config.prefix}-${Date.now()}`

  console.log('📂 Generated filename:', fileName)

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

    const unsignedUrl = `https://violet-fashionable-blackbird-836.mypinata.cloud/files/${result.data.cid}`
    const { signedUrl } = await pinataSignedUrl(unsignedUrl)

    const endTime = Date.now()
    const duration = endTime - startTime
    console.log('✅ Upload completed at:', new Date(endTime).toISOString())
    console.log('🕐 Total upload duration:', `${duration}ms`)
    console.log('🔗 Generated signed URL:', signedUrl)
    console.log('📁 File CID:', result.data.cid)

    return signedUrl
  } catch (error) {
    const endTime = Date.now()
    const duration = endTime - startTime
    console.log('❌ Upload failed at:', new Date(endTime).toISOString())
    console.log('🕐 Failed after:', `${duration}ms`)
    console.error(error)
    throw error
  }
}
