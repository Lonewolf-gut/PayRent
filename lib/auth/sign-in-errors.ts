import { CredentialsSignin } from "next-auth";

export class MissingCredentialsError extends CredentialsSignin {
  code = "missing_credentials";
}

export class EmailNotFoundError extends CredentialsSignin {
  code = "email_not_found";
}

export class InvalidPasswordError extends CredentialsSignin {
  code = "invalid_password";
}

export class AccountSuspendedError extends CredentialsSignin {
  code = "account_suspended";
}

export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

export class TwoFactorRequiredError extends CredentialsSignin {
  code = "two_factor_required";
}

export class InvalidTwoFactorError extends CredentialsSignin {
  code = "invalid_two_factor";
}

export class WrongRoleError extends CredentialsSignin {
  code = "wrong_role";
}

export class DatabaseUnavailableError extends CredentialsSignin {
  code = "database_unavailable";
}
