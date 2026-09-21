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

// Adjust to match what your backend actually returns
export type LoginResponse = {
  token?: string;
  [key: string]: unknown;
};