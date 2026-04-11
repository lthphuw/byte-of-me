export interface PublicSocialLink {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  platform: string;
  url: string;
  sortOrder: number;
  userId: string;
}
