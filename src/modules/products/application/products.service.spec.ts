import { NotFoundError } from '../../../common/errors/application-error';
import type { TeamMembership } from '../../teams/domain/team.schemas';
import type { ProductRecord } from '../domain/product.schemas';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const actorUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const teamId = '11111111-1111-4111-8111-111111111111';
  const productId = '22222222-2222-4222-8222-222222222222';
  const domainId = '33333333-3333-4333-8333-333333333333';
  const createdAt = new Date('2026-03-11T10:00:00.000Z');

  const membership: TeamMembership = {
    id: '44444444-4444-4444-8444-444444444444',
    teamId,
    userId: actorUserId,
    role: 'owner',
  };

  const productRecord: ProductRecord = {
    id: productId,
    teamId,
    domainId,
    createdBy: actorUserId,
    name: 'Tracked product',
    url: 'https://example.com/product',
    selector: '.price',
    xpathSelector: null,
    regexPattern: null,
    jsonPath: null,
    scrapeStrategy: 'browser',
    htmlHash: null,
    lastPrice: null,
    lastCheckedAt: null,
    lastPriceChangedAt: null,
    lastScrapeError: null,
    currency: null,
    status: 'active',
    createdAt,
  };

  const createService = () => {
    const productsRepository = {
      createProduct: jest.fn(),
      listProductsByTeam: jest.fn(),
      findProductById: jest.fn(),
    };
    const teamMembershipReader = {
      getMembershipOrThrow: jest.fn(),
    };

    return {
      service: new ProductsService(productsRepository, teamMembershipReader),
      productsRepository,
      teamMembershipReader,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a product after verifying membership', async () => {
    const { service, productsRepository, teamMembershipReader } =
      createService();

    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(membership);
    productsRepository.createProduct.mockResolvedValueOnce(productRecord);

    const result = await service.createProduct(actorUserId, {
      teamId,
      domainId,
      name: 'Tracked product',
      url: 'https://example.com/product',
      selector: '.price',
      scrapeStrategy: 'browser',
    });

    expect(teamMembershipReader.getMembershipOrThrow).toHaveBeenCalledWith(
      teamId,
      actorUserId,
    );
    expect(productsRepository.createProduct).toHaveBeenCalledWith({
      teamId,
      domainId,
      createdBy: actorUserId,
      name: 'Tracked product',
      url: 'https://example.com/product',
      selector: '.price',
      xpathSelector: undefined,
      regexPattern: undefined,
      jsonPath: undefined,
      scrapeStrategy: 'browser',
    });
    expect(result).toEqual(productRecord);
  });

  it('lists team products only after verifying membership', async () => {
    const { service, productsRepository, teamMembershipReader } =
      createService();

    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(membership);
    productsRepository.listProductsByTeam.mockResolvedValueOnce([
      productRecord,
    ]);

    const result = await service.listProducts(actorUserId, teamId);

    expect(teamMembershipReader.getMembershipOrThrow).toHaveBeenCalledWith(
      teamId,
      actorUserId,
    );
    expect(productsRepository.listProductsByTeam).toHaveBeenCalledWith(teamId);
    expect(result).toEqual([productRecord]);
  });

  it('fails when requesting a product that does not exist', async () => {
    const { service, productsRepository, teamMembershipReader } =
      createService();

    productsRepository.findProductById.mockResolvedValueOnce(null);

    await expect(
      service.getProductOrThrow(actorUserId, productId),
    ).rejects.toThrow(NotFoundError);
    expect(teamMembershipReader.getMembershipOrThrow).not.toHaveBeenCalled();
  });

  it('returns a product only after verifying team membership', async () => {
    const { service, productsRepository, teamMembershipReader } =
      createService();

    productsRepository.findProductById.mockResolvedValueOnce(productRecord);
    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(membership);

    const result = await service.getProductOrThrow(actorUserId, productId);

    expect(teamMembershipReader.getMembershipOrThrow).toHaveBeenCalledWith(
      teamId,
      actorUserId,
    );
    expect(result).toEqual(productRecord);
  });
});
