import { HttpErrorResponse } from '@angular/common/http';
import { resolveCreateUserErrorMessage } from './user-management.component';

describe('resolveCreateUserErrorMessage', () => {
  it('returns backend message for 409 conflicts', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { message: 'Email already exists in Keycloak.' }
    });

    expect(resolveCreateUserErrorMessage(error)).toBe('Email already exists in Keycloak.');
  });

  it('returns validation details for 400 responses', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        fields: [
          { field: 'email', message: 'must be a well-formed email address' },
          { field: 'username', message: 'must not be blank' }
        ]
      }
    });

    expect(resolveCreateUserErrorMessage(error)).toBe('must be a well-formed email address | must not be blank');
  });

  it('returns fallback message for 500 without payload', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: null
    });

    expect(resolveCreateUserErrorMessage(error)).toBe(
      'User creation failed due to a server error. Please retry.'
    );
  });
});
