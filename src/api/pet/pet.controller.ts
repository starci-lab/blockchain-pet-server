import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import { PetService } from './pet.service'
import { CreatePetDto } from './dto/create-pet.dto'
import { UpdatePetDto } from './dto/update-pet.dto'

@Controller('pet')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Post()
  create(@Body() createPetDto: CreatePetDto) {
    return this.petService.create(createPetDto)
  }

  @Post('create-pet-type')
  createPetType(@Body() createPetDto: CreatePetDto) {
    return this.petService.createPetType(createPetDto)
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
