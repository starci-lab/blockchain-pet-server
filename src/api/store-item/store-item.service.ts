import { Injectable } from '@nestjs/common';
import { CreateStoreItemDto } from './dto/create-store-item.dto';
import { UpdateStoreItemDto } from './dto/update-store-item.dto';

@Injectable()
export class StoreItemService {
  create(createStoreItemDto: CreateStoreItemDto) {
    return 'This action adds a new storeItem';
  }

  findAll() {
    return `This action returns all storeItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} storeItem`;
  }

  update(id: number, updateStoreItemDto: UpdateStoreItemDto) {
    return `This action updates a #${id} storeItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} storeItem`;
  }
}
