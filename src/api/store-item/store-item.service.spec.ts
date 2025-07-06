import { Test, TestingModule } from '@nestjs/testing';
import { StoreItemService } from './store-item.service';

describe('StoreItemService', () => {
  let service: StoreItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreItemService],
    }).compile();

    service = module.get<StoreItemService>(StoreItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
