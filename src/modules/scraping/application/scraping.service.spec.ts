import {
  NotFoundError,
  ValidationError,
} from '../../../common/errors/application-error';
import type {
  ScheduleScrapeResult,
  ScrapeJobRecord,
} from '../domain/scraping.schemas';
import type { TeamMembership } from '../../teams/domain/team.schemas';
import { ScrapingService } from './scraping.service';

describe('ScrapingService', () => {
  const actorUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const productId = '11111111-1111-4111-8111-111111111111';
  const teamId = '22222222-2222-4222-8222-222222222222';
  const domainId = '33333333-3333-4333-8333-333333333333';
  const otherDomainId = '44444444-4444-4444-8444-444444444444';
  const scrapeJobId = '55555555-5555-4555-8555-555555555555';

  const membership: TeamMembership = {
    id: '66666666-6666-4666-8666-666666666666',
    teamId,
    userId: actorUserId,
    role: 'owner',
  };

  const createService = () => {
    const scrapingRepository = {
      findProductContext: jest.fn(),
      createScrapeJob: jest.fn(),
      listJobsForProduct: jest.fn(),
      listProductHistory: jest.fn(),
    };
    const scrapeJobDispatcher = {
      dispatch: jest.fn(),
    };
    const teamMembershipReader = {
      getMembershipOrThrow: jest.fn(),
    };

    return {
      service: new ScrapingService(
        scrapingRepository,
        scrapeJobDispatcher,
        teamMembershipReader,
      ),
      scrapingRepository,
      scrapeJobDispatcher,
      teamMembershipReader,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails fast when scheduling a scrape for a missing product', async () => {
    const {
      service,
      scrapingRepository,
      teamMembershipReader,
      scrapeJobDispatcher,
    } = createService();

    scrapingRepository.findProductContext.mockResolvedValueOnce(null);

    await expect(
      service.scheduleScrape(actorUserId, { productId, domainId }),
    ).rejects.toThrow(NotFoundError);
    expect(teamMembershipReader.getMembershipOrThrow).not.toHaveBeenCalled();
    expect(scrapeJobDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('rejects scheduling when the requested domain does not match the product domain', async () => {
    const {
      service,
      scrapingRepository,
      teamMembershipReader,
      scrapeJobDispatcher,
    } = createService();

    scrapingRepository.findProductContext.mockResolvedValueOnce({
      productId,
      teamId,
      domainId,
    });
    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(membership);

    await expect(
      service.scheduleScrape(actorUserId, {
        productId,
        domainId: otherDomainId,
      }),
    ).rejects.toThrow(ValidationError);
    expect(teamMembershipReader.getMembershipOrThrow).toHaveBeenCalledWith(
      teamId,
      actorUserId,
    );
    expect(scrapingRepository.createScrapeJob).not.toHaveBeenCalled();
    expect(scrapeJobDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('creates and dispatches a scrape job when the actor can access the product', async () => {
    const {
      service,
      scrapingRepository,
      scrapeJobDispatcher,
      teamMembershipReader,
    } = createService();

    scrapingRepository.findProductContext.mockResolvedValueOnce({
      productId,
      teamId,
      domainId,
    });
    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(membership);
    scrapingRepository.createScrapeJob.mockImplementationOnce(
      (input: { productId: string; domainId: string; scheduledAt: Date }) =>
        Promise.resolve({
          id: scrapeJobId,
          productId: input.productId,
          status: 'pending',
          scheduledAt: input.scheduledAt,
          startedAt: null,
          finishedAt: null,
          workerId: null,
          domainId: input.domainId,
          retryCount: 0,
          createdAt: new Date('2026-03-11T10:00:00.000Z'),
        }),
    );
    scrapeJobDispatcher.dispatch.mockResolvedValueOnce({
      queueJobId: 'queue-job-1',
      queueName: 'scrape-jobs',
      queueJobName: 'scrape-product',
    });

    const result: ScheduleScrapeResult = await service.scheduleScrape(
      actorUserId,
      {
        productId,
        domainId,
      },
    );

    const [createScrapeJobInput] = scrapingRepository.createScrapeJob.mock
      .calls[0] as [
        {
          productId: string;
          domainId: string;
          scheduledAt: Date;
        },
      ];

    expect(createScrapeJobInput).toMatchObject({
      productId,
      domainId,
    });
    expect(createScrapeJobInput.scheduledAt).toBeInstanceOf(Date);
    expect(scrapeJobDispatcher.dispatch).toHaveBeenCalledWith({
      scrapeJobId,
      productId,
      domainId,
    });
    expect(result).toEqual({
      jobId: 'queue-job-1',
      queue: 'scrape-jobs',
      name: 'scrape-product',
      status: 'queued',
      data: {
        scrapeJobId,
        productId,
        domainId,
      },
    });
  });

  it('lists product jobs only after verifying team membership', async () => {
    const { service, scrapingRepository, teamMembershipReader } =
      createService();
    const createdAt = new Date('2026-03-11T10:00:00.000Z');

    scrapingRepository.findProductContext.mockResolvedValueOnce({
      productId,
      teamId,
      domainId,
    });
    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(membership);
    scrapingRepository.listJobsForProduct.mockResolvedValueOnce([
      {
        id: scrapeJobId,
        productId,
        status: 'completed',
        scheduledAt: createdAt,
        startedAt: createdAt,
        finishedAt: createdAt,
        workerId: 'worker-1',
        domainId,
        retryCount: 1,
        createdAt,
      },
    ]);

    const jobs: ScrapeJobRecord[] = await service.listProductJobs(
      actorUserId,
      productId,
    );

    expect(teamMembershipReader.getMembershipOrThrow).toHaveBeenCalledWith(
      teamId,
      actorUserId,
    );
    expect(scrapingRepository.listJobsForProduct).toHaveBeenCalledWith(
      productId,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: scrapeJobId,
      productId,
      status: 'completed',
      domainId,
    });
  });
});
