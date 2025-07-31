import { Processor, WorkerHost } from '@nestjs/bullmq'
import { QUEUE_NAME } from '../../constants/queue.constant'
import { PetService } from 'src/api/pet/pet.service'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { getTimeDifferenceInSeconds } from 'src/game/utils/timer'
import { PetType } from 'src/api/pet/schemas/pet-type.schema'
import { PetEvolutionService } from './pet-evolution.service'

@Processor(QUEUE_NAME.UPDATE_EVOLUTION)
export class PetEvolutionProcessor extends WorkerHost {
  private readonly logger = new Logger(PetEvolutionProcessor.name)

  constructor(
    private readonly petService: PetService,
    private readonly PetEvolutionService: PetEvolutionService
  ) {
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
        const isAdult = pet.isAdult
        const petType = pet.type as PetType

        const differenceInMs = getTimeDifferenceInSeconds(pet.last_claim) / 60
        console.log('differenceInMs:', differenceInMs)

        // Ensure pet.type is populated as PetType, not just ObjectId
        console.log('is update income:', differenceInMs >= petType?.time_natural)
        if (differenceInMs >= petType?.time_natural) {
          if (!isAdult) {
            await this.petService.updatePetAdult(petId)
          } else if (pet.token_income < petType?.max_income_per_claim) {
            const now = new Date()
            const incomeCal = Math.floor((differenceInMs / petType?.time_natural) * petType?.income_per_claim)
            pet.token_income += incomeCal
            pet.total_income += incomeCal
            pet.last_claim = now

            await pet.save()
            this.logger.log(
              `Pet ${petId} earned ${incomeCal} tokens. Total: ${pet.token_income}/${petType?.max_income_per_claim}`
            )

            // If pet reach max income, remove job
            // TODO: Implement this
            // if (pet.token_income >= petType?.max_income_per_claim) {
            //   try {
            //     await this.PetEvolutionService.removeUpdateStatsJob(petId)
            //     this.logger.log(
            //       `🗑️ Removed evolution job for pet ${petId} - reached max income (${pet.token_income}/${petType?.max_income_per_claim})`
            //     )
            //   } catch (removeError) {
            //     this.logger.error(`Failed to remove job for pet ${petId}:`, removeError)
            //   }
            // }
          }
        }
      }

      this.logger.log(`Successfully processed job ${job.id}`)
      return pets
    } catch (error) {
      console.log('error at pet processor', error)
      throw error
    }
  }
}
