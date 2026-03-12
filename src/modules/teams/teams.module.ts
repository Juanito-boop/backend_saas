import { Module } from '@nestjs/common';

import { TEAM_MEMBERSHIP_READER } from './application/team-membership-reader';
import { TEAMS_REPOSITORY } from './application/teams.repository';
import { TeamsController } from './teams.controller';
import { DrizzleTeamsRepository } from './infrastructure/drizzle-teams.repository';
import { TeamsService } from './teams.service';

@Module({
  controllers: [TeamsController],
  providers: [
    TeamsService,
    DrizzleTeamsRepository,
    {
      provide: TEAMS_REPOSITORY,
      useExisting: DrizzleTeamsRepository,
    },
    {
      provide: TEAM_MEMBERSHIP_READER,
      useExisting: TeamsService,
    },
  ],
  exports: [TeamsService, TEAM_MEMBERSHIP_READER],
})
export class TeamsModule {}
