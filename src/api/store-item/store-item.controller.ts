import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StoreItemService } from './store-item.service';
import { CreateStoreItemDto } from './dto/create-store-item.dto';
import { UpdateStoreItemDto } from './dto/update-store-item.dto';

@Controller('store-item')
export class StoreItemController {
  constructor(private readonly storeItemService: StoreItemService) {}

  @Post()
  create(@Body() createStoreItemDto: CreateStoreItemDto) {
    return this.storeItemService.create(createStoreItemDto);
  }

  @Get()
  findAll() {
    return this.storeItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storeItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStoreItemDto: UpdateStoreItemDto) {
    return this.storeItemService.update(+id, updateStoreItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storeItemService.remove(+id);
  }
}
