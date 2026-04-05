import { Base } from '@/models/base';

export interface Media extends Base {
  fileName: string;
  fileKey: string;
  mimeType: string;
  size: number;
  provider: string;
  bucket: string;
  url: string;
}
