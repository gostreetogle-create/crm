import { of } from 'rxjs';
import type { ProductsRepository } from '@srm/products-data-access';
import type { TradeGoodsRepository } from '@srm/trade-goods-data-access';
import {
  hubCatalogLoadProductById,
  hubCatalogRemoveTradeGood,
  hubCatalogSaveProduct,
  hubCatalogSaveTradeGood,
  hubCatalogUploadTradeGoodPhotos,
} from './dictionaries-hub-catalog.operations';

describe('dictionaries-hub-catalog.operations', () => {
  const productsRepo = {
    getById: jest.fn(),
    getItems: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as unknown as ProductsRepository;

  const tradeGoodsRepo = {
    getById: jest.fn(),
    getItems: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadPhotos: jest.fn(),
  } as unknown as TradeGoodsRepository;

  beforeEach(() => jest.clearAllMocks());

  it('hubCatalogLoadProductById delegates to getById', async () => {
    const item = { id: 'p1' } as never;
    (productsRepo.getById as jest.Mock).mockReturnValue(of(item));
    await expect(hubCatalogLoadProductById(productsRepo, 'p1')).resolves.toBe(item);
    expect(productsRepo.getById).toHaveBeenCalledWith('p1');
  });

  it('hubCatalogSaveProduct creates when editId is null', async () => {
    const created = { id: 'new' } as never;
    const payload = {} as never;
    (productsRepo.create as jest.Mock).mockReturnValue(of(created));
    await expect(hubCatalogSaveProduct(productsRepo, null, payload)).resolves.toBe(created);
    expect(productsRepo.create).toHaveBeenCalledWith(payload);
    expect(productsRepo.update).not.toHaveBeenCalled();
  });

  it('hubCatalogSaveProduct updates when editId is set', async () => {
    const updated = { id: 'e1' } as never;
    const payload = {} as never;
    (productsRepo.update as jest.Mock).mockReturnValue(of(updated));
    await expect(hubCatalogSaveProduct(productsRepo, 'e1', payload)).resolves.toBe(updated);
    expect(productsRepo.update).toHaveBeenCalledWith('e1', payload);
  });

  it('hubCatalogSaveTradeGood create/update trade goods', async () => {
    const created = { id: 'tg' } as never;
    (tradeGoodsRepo.create as jest.Mock).mockReturnValue(of(created));
    await expect(hubCatalogSaveTradeGood(tradeGoodsRepo, null, {} as never)).resolves.toBe(created);
    (tradeGoodsRepo.update as jest.Mock).mockReturnValue(of(created));
    await expect(hubCatalogSaveTradeGood(tradeGoodsRepo, 'tg', {} as never)).resolves.toBe(created);
    expect(tradeGoodsRepo.update).toHaveBeenCalledWith('tg', expect.anything());
  });

  it('hubCatalogRemoveTradeGood passes deleteRelated', async () => {
    (tradeGoodsRepo.remove as jest.Mock).mockReturnValue(of(void 0));
    await hubCatalogRemoveTradeGood(tradeGoodsRepo, 'x', { deleteRelated: true });
    expect(tradeGoodsRepo.remove).toHaveBeenCalledWith('x', { deleteRelated: true });
  });

  it('hubCatalogUploadTradeGoodPhotos delegates', async () => {
    const files = [new File([], 'a.png')];
    const out = { id: '1' } as never;
    (tradeGoodsRepo.uploadPhotos as jest.Mock).mockReturnValue(of(out));
    await expect(hubCatalogUploadTradeGoodPhotos(tradeGoodsRepo, '1', files, 2)).resolves.toBe(out);
    expect(tradeGoodsRepo.uploadPhotos).toHaveBeenCalledWith('1', files, 2);
  });
});
