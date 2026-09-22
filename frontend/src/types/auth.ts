export type GoogleUser = {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
};

export type GoogleSession = {
  user: GoogleUser;
  idToken: string;
};

export type LoginResponse = {
  token?: string;
  [key: string]: unknown;
};