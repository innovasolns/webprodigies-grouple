import { UploadClient } from "@uploadcare/upload-client"

console.log("Uploadcare Config:", {
  publicKey: process.env.NEXT_PUBLIC_NEXT_UPLOADCARE_PUB_KEY,
  hasKey: !!process.env.NEXT_PUBLIC_NEXT_UPLOADCARE_PUB_KEY,
})

export const upload = new UploadClient({
  publicKey: process.env.NEXT_PUBLIC_NEXT_UPLOADCARE_PUB_KEY as string,
})
