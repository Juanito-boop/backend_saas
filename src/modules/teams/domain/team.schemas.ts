import { z } from 'zod';

export const teamRoleSchema = z.enum(['owner', 'admin', 'member']);
export const manageableTeamRoleSchema = z.enum(['admin', 'member']);

export const teamMembershipSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  role: teamRoleSchema,
});

export const teamRecordSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
  plan: z.string(),
  urlLimit: z.number().int(),
  userLimit: z.number().int(),
  createdAt: z.date(),
});

export const teamSummarySchema = z.object({
  teamId: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
  plan: z.string(),
  urlLimit: z.number().int(),
  userLimit: z.number().int(),
  createdAt: z.date(),
  membershipRole: teamRoleSchema,
});

export const teamMemberSummarySchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  globalRole: z.string(),
  teamRole: teamRoleSchema,
  joinedAt: z.date(),
});

export const teamUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

export const invitedTeamMemberSchema = teamMembershipSchema.extend({
  user: teamUserSchema,
});

export const removeMemberResultSchema = z.object({
  success: z.literal(true),
});

export const teamSummaryListSchema = z.array(teamSummarySchema);
export const teamMemberSummaryListSchema = z.array(teamMemberSummarySchema);

export const createTeamBodySchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100),
  plan: z.string().trim().min(1).max(30).optional(),
  urlLimit: z.coerce.number().int().min(1).optional(),
  userLimit: z.coerce.number().int().min(1).optional(),
});

export const inviteUserBodySchema = z.object({
  userEmail: z.string().trim().email().max(254),
});

export const updateMemberRoleBodySchema = z.object({
  role: manageableTeamRoleSchema,
});

export type TeamRole = z.infer<typeof teamRoleSchema>;
export type ManageableTeamRole = z.infer<typeof manageableTeamRoleSchema>;
export type TeamMembership = z.infer<typeof teamMembershipSchema>;
export type TeamRecord = z.infer<typeof teamRecordSchema>;
export type TeamSummary = z.infer<typeof teamSummarySchema>;
export type TeamMemberSummary = z.infer<typeof teamMemberSummarySchema>;
export type TeamUser = z.infer<typeof teamUserSchema>;
export type InvitedTeamMember = z.infer<typeof invitedTeamMemberSchema>;
export type RemoveMemberResult = z.infer<typeof removeMemberResultSchema>;
export type CreateTeamBody = z.infer<typeof createTeamBodySchema>;
export type InviteUserBody = z.infer<typeof inviteUserBodySchema>;
export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleBodySchema>;
