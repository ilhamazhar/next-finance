export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
};

export type Pagination = {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
};

export type PaginatedEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T[];
  pagination: Pagination;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    name: string;
    email: string;
    email_verified_at?: string | null;
    created_at: string;
    updated_at: string;
  };
};
