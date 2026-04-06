import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialCharacter: boolean;
}

export interface PasswordPolicyState {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  specialCharacter: boolean;
}

export const KEYCLOAK_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialCharacter: true
};

const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_CHARACTER_REGEX = /[^A-Za-z0-9]/;

export function evaluatePasswordPolicy(
  password: string | null | undefined,
  policy: PasswordPolicy = KEYCLOAK_PASSWORD_POLICY
): PasswordPolicyState {
  const safePassword = String(password ?? '');

  return {
    minLength: safePassword.length >= policy.minLength,
    uppercase: !policy.requireUppercase || UPPERCASE_REGEX.test(safePassword),
    lowercase: !policy.requireLowercase || LOWERCASE_REGEX.test(safePassword),
    number: !policy.requireNumber || NUMBER_REGEX.test(safePassword),
    specialCharacter: !policy.requireSpecialCharacter || SPECIAL_CHARACTER_REGEX.test(safePassword)
  };
}

export function passwordPolicyValidator(
  policy: PasswordPolicy = KEYCLOAK_PASSWORD_POLICY
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || String(value).length === 0) {
      return null;
    }

    const state = evaluatePasswordPolicy(String(value), policy);
    const details: ValidationErrors = {};

    if (!state.minLength) {
      details['minLength'] = {
        requiredLength: policy.minLength,
        actualLength: String(value).length
      };
    }
    if (!state.uppercase) {
      details['uppercase'] = true;
    }
    if (!state.lowercase) {
      details['lowercase'] = true;
    }
    if (!state.number) {
      details['number'] = true;
    }
    if (!state.specialCharacter) {
      details['specialCharacter'] = true;
    }

    return Object.keys(details).length > 0 ? { passwordPolicy: details } : null;
  };
}
