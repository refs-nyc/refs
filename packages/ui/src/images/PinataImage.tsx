// This component takes a local image uri, displays the image and meanwhile posts the image to Pinata
import { Image } from 'expo-image'

export const PinataImage = ({ source }: { source: string }) => {
  // Determine if this image is already on IPFS?

  // Upload
  const uploadImage = async () => {
    //
  }

  return <Image source={source} />
}
