import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger'
import { StoreItemService } from './store-item.service'
import { CreateStoreItemDto } from './dto/create-store-item.dto'
import { UpdateStoreItemDto } from './dto/update-store-item.dto'
import { ResponseItemDto, ResponseStoreItemDto } from './dto/response-store-item.dto'

@ApiTags('Store Items')
@Controller('store-item')
export class StoreItemController {
  constructor(private readonly storeItemService: StoreItemService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new store item' })
  @ApiResponse({
    status: 201,
    description: 'Store item has been successfully created.',
    type: ResponseItemDto
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid input data.'
  })
  @ApiBody({ type: CreateStoreItemDto })
  async create(@Body() createStoreItemDto: CreateStoreItemDto) {
    return await this.storeItemService.create(createStoreItemDto)
  }

  @Get()
  @ApiOperation({ summary: 'Get all store items' })
  @ApiResponse({
    status: 200,
    description: 'Return all store items.',
    type: [ResponseStoreItemDto]
  })
  async findAll() {
    return await this.storeItemService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store item by ID' })
  @ApiParam({ name: 'id', description: 'Store item ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the store item.',
    type: ResponseItemDto
  })
  @ApiResponse({
    status: 404,
    description: 'Store item not found.'
  })
  async findOne(@Param('id') id: string) {
    return await this.storeItemService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update store item by ID' })
  @ApiParam({ name: 'id', description: 'Store item ID' })
  @ApiBody({ type: UpdateStoreItemDto })
  @ApiResponse({
    status: 200,
    description: 'Store item has been successfully updated.',
    type: ResponseStoreItemDto
  })
  @ApiResponse({
    status: 404,
    description: 'Store item not found.'
  })
  update(@Param('id') id: string, @Body() updateStoreItemDto: UpdateStoreItemDto) {
    return this.storeItemService.update(+id, updateStoreItemDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete store item by ID' })
  @ApiParam({ name: 'id', description: 'Store item ID' })
  @ApiResponse({
    status: 200,
    description: 'Store item has been successfully deleted.'
  })
  @ApiResponse({
    status: 404,
    description: 'Store item not found.'
  })
  remove(@Param('id') id: string) {
    return this.storeItemService.remove(+id)
  }
}
