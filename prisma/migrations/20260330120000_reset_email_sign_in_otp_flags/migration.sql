-- Sign-in email OTP is optional; clear opt-ins so password-only login works without SMTP.
UPDATE "User" SET "emailSignInOtpEnabled" = false;
