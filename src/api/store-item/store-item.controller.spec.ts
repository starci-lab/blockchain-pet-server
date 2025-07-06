import { Test, TestingModule } from '@nestjs/testing';
import { StoreItemController } from './store-item.controller';
import { StoreItemService } from './store-item.service';

describe('StoreItemController', () => {
  let controller: StoreItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreItemController],
      providers: [StoreItemService],
    }).compile();

    controller = module.get<StoreItemController>(StoreItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
