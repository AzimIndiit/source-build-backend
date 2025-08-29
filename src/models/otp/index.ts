// Export the main model
export { default as Otp } from './otp.model.js';

// Export types
export {
  OtpType,
  type IOtp,
  type IOtpBase,
  type IOtpModel,
  type CreateOtpInput,
  type VerifyOtpInput,
} from './otp.types.js';

// Export validators
export {
  createOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
  type CreateOtpInput as CreateOtpValidatorInput,
  type VerifyOtpInput as VerifyOtpValidatorInput,
  type ResendOtpInput,
} from './otp.validators.js';