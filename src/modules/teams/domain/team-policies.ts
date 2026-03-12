import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/application-error';
import type { TeamMembership, TeamRole } from './team.types';

export function normalizeTeamName(name: string) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new ValidationError('name is required');
  }

  return normalizedName;
}

export function normalizeUserEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ValidationError('userEmail is required');
  }

  return normalizedEmail;
}

export function validateTeamLimits(input: {
  userLimit?: number;
  urlLimit?: number;
}) {
  if (input.userLimit !== undefined && input.userLimit < 1) {
    throw new ValidationError('userLimit must be at least 1');
  }

  if (input.urlLimit !== undefined && input.urlLimit < 1) {
    throw new ValidationError('urlLimit must be at least 1');
  }
}

export function assertCanManageMembers(role: TeamRole) {
  if (role !== 'owner' && role !== 'admin') {
    throw new ForbiddenError('Only team owner or admin can manage members');
  }
}

export function assertOwnerRole(membership: TeamMembership) {
  if (membership.role !== 'owner') {
    throw new ForbiddenError('Only team owner can manage subscription');
  }
}

export function assertMembershipExists<T>(membership: T | null): T {
  if (!membership) {
    throw new ForbiddenError('You are not a member of this team');
  }

  return membership;
}

export function assertTeamExists<T>(team: T | null): T {
  if (!team) {
    throw new NotFoundError('Team not found');
  }

  return team;
}

export function assertUserExists<T>(user: T | null): T {
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

export function assertMembershipDoesNotExist(membership: TeamMembership | null) {
  if (membership) {
    throw new ConflictError('User is already a member of this team');
  }
}

export function assertWithinTeamUserLimit(currentMembers: number, userLimit: number) {
  if (currentMembers >= userLimit) {
    throw new ConflictError('This team has reached its user limit');
  }
}

export function assertMemberCanBeRemovedOrChanged(targetMembership: TeamMembership) {
  if (targetMembership.role === 'owner') {
    throw new ForbiddenError('Owner cannot be removed or role-changed');
  }
}