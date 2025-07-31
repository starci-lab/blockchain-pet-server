import { Processor, WorkerHost } from '@nestjs/bullmq'
import { QUEUE_NAME } from '../../constants/queue.constant'
import { PetService } from 'src/api/pet/pet.service'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { calculateStatUpdate } from 'src/game/utils/timer'

@Processor(QUEUE_NAME.UPDATE_EVOLUTION)
export class PetEvolutionProcessor extends WorkerHost {
  private readonly logger = new Logger(PetEvolutionProcessor.name)

  constructor(private readonly petService: PetService) {
    super()
  }

  async process(job: Job) {
    try {
      this.logger.log(`Processing jobs ${job.id}`)

      const pets = await this.petService.findActivePets()
      if (!pets) {
        throw new Error(`Pets not found`)
      }

      for (const pet of pets) {
        const petId = pet._id as string
        const petStats = pet.stats

        const hungerUpdate = calculateStatUpdate(petStats.last_update_hunger, petStats.hunger, 2)

        const happinessUpdate = calculateStatUpdate(petStats.last_update_happiness, petStats.happiness, 1)

        const cleanlinessUpdate = calculateStatUpdate(petStats.last_update_cleanliness, petStats.cleanliness, 1)

        const newPetStats = {
          hunger: hungerUpdate.newStat,
          happiness: happinessUpdate.newStat,
          cleanliness: cleanlinessUpdate.newStat,
          last_update_hunger: hungerUpdate.newLastUpdate,
          last_update_happiness: happinessUpdate.newLastUpdate,
          last_update_cleanliness: cleanlinessUpdate.newLastUpdate
        }

        // Update pet stats
        await this.petService.updateStats(petId, newPetStats)
      }

      this.logger.log(`Successfully processed job ${job.id}`)
      return pets
    } catch (error) {
      console.log('error at pet processor', error)
      throw error
    }
  }
}
