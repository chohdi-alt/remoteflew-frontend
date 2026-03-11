import { AuthService } from './auth.service';

export function authInitFactory(authService: AuthService): () => Promise<boolean> {
  return () => authService.init();
}
