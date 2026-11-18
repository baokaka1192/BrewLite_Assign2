/** Identity attached to `request.user` by JwtStrategy after the token is verified. */
export interface AuthUser {
  id: string;
  email: string;
}
