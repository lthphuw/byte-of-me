import { uploadMedia } from './upload-media';

export async function uploadSingleMedia(file: File): Promise<string> {
  const res = await uploadMedia([file]);

  if (!res?.success || !res.data?.[0].url) {
    throw new Error('Upload failed');
  }

  return res.data[0].url;
}
