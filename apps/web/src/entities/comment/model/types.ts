export interface PublicComment {
  id: string;
  createdAt: Date;
  content: string;
  user: {
    email: string;
  };
}
