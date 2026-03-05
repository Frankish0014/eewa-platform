/**
 * Core domain types and shared interfaces.
 */

export type Role =
  | 'Student'
  | 'Mentor'
  | 'Admin'
  | 'InstitutionStaff'
  | 'OpportunityProvider';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  role: Role;
}
