import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import { PetService } from './pet.service'
import { CreatePetDto, CreatePetTypeDto } from './dto/create-pet.dto'
import { UpdatePetDto } from './dto/update-pet.dto'
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ResponsePetTypeDto } from './dto/response-petType.dto'

@Controller('pet')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pet' })
  @ApiResponse({
    status: 201,
    description: 'Pet has been successfully created.',
    type: ResponsePetTypeDto
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid input data.'
  })
  @ApiBody({ type: CreatePetDto })
  create(@Body() createPetDto: CreatePetDto) {
    return this.petService.create(createPetDto)
  }

  @Post('create-pet-type')
  @ApiOperation({ summary: 'Create a new store item' })
  @ApiResponse({
    status: 201,
    description: 'Store item has been successfully created.',
    type: ResponsePetTypeDto
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid input data.'
  })
  @ApiBody({ type: CreatePetTypeDto })
  async createPetType(@Body() createPetDto: CreatePetDto) {
    const response = await this.petService.createPetType(createPetDto)
    return response
  }

  @Get()
  findAll() {
    return this.petService.findAll()
  }

  @Get('active')
  findActivePets() {
    return this.petService.findActivePets()
  }

  @Get('owner/:ownerId')
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.petService.findByOwner(ownerId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.petService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePetDto: UpdatePetDto) {
    return this.petService.update(id, updatePetDto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.petService.remove(id)
  }
}
