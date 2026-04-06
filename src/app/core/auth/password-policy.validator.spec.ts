import { FormControl } from '@angular/forms';
import {
  evaluatePasswordPolicy,
  KEYCLOAK_PASSWORD_POLICY,
  passwordPolicyValidator
} from './password-policy.validator';

describe('passwordPolicyValidator', () => {
  it('returns detailed errors for weak passwords', () => {
    const control = new FormControl<string>('weak');
    const validator = passwordPolicyValidator(KEYCLOAK_PASSWORD_POLICY);
    const result = validator(control);

    expect(result).toEqual(
      jasmine.objectContaining({
        passwordPolicy: jasmine.objectContaining({
          minLength: jasmine.any(Object),
          uppercase: true,
          number: true,
          specialCharacter: true
        })
      })
    );
  });

  it('returns null for valid passwords', () => {
    const control = new FormControl<string>('Valid@123');
    const validator = passwordPolicyValidator(KEYCLOAK_PASSWORD_POLICY);

    const result = validator(control);

    expect(result).toBeNull();
  });
});

describe('evaluatePasswordPolicy', () => {
  it('marks each policy rule in real time', () => {
    const state = evaluatePasswordPolicy('Abcdef12');

    expect(state.minLength).toBeTrue();
    expect(state.uppercase).toBeTrue();
    expect(state.lowercase).toBeTrue();
    expect(state.number).toBeTrue();
    expect(state.specialCharacter).toBeFalse();
  });
});
