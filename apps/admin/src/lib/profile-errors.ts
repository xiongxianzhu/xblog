import { ApiError } from "@/lib/api";

const PROFILE_ERRORS: Record<string, string> = {
  "Email is already linked": "emailTaken",
  "Phone number is already linked": "phoneTaken",
  "Invalid phone number": "invalidPhone",
  "Birth date cannot be in the future": "futureBirth",
  "Unsupported image type": "unsupportedImage",
  "Empty file": "emptyFile",
  "File too large": "avatarSize",
};

/** Profile feedback uses localized messages, never untranslated server strings. */
export function profileErrorKey(error: unknown, fallback = "retry"): string {
  if (error instanceof Error && PROFILE_ERRORS[error.message]) return PROFILE_ERRORS[error.message];
  if (error instanceof ApiError) {
    if (error.status === 401) return "sessionExpired";
    if (error.status === 403) return "permissionDenied";
    if (error.status === 422) return "invalidInput";
  }
  return fallback;
}
