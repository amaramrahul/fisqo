/** Success shape for list endpoints. `nextCursor` is always null until pagination lands. */
export interface ListEnvelope<T> {
  data: T[];
  nextCursor: string | null;
}

/** Success shape for single-resource endpoints. */
export interface ItemEnvelope<T> {
  data: T;
}

/** The standardised error shape from the tech design. Never wrapped in `data`. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}
