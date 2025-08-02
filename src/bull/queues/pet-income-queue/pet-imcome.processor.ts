import { Processor, WorkerHost } from '@nestjs/bullmq'
import { QUEUE_NAME } from '../../constants/queue.constant'
import { PetService } from 'src/api/pet/pet.service'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { getTimeDifferenceInSeconds } from 'src/game/utils/timer'
import { PetType } from 'src/api/pet/schemas/pet-type.schema'

@Processor(QUEUE_NAME.CREATE_INCOME)
export class PetIncomeProcessor extends WorkerHost {
  private readonly logger = new Logger(PetIncomeProcessor.name)

  constructor(private readonly petService: PetService) {
    super()
  }

  async process(job: Job) {
    try {
      this.logger.log(`Processing jobs ${job.id}`)

      const pets = await this.petService.findPetPosibleIncome()

      if (!pets) {
        return
      }

      for (const pet of pets) {
        const petId = pet._id as string
        const petType = pet.type as PetType

        const differenceInMs = getTimeDifferenceInSeconds(pet.last_claim) / 60
        console.log('differenceInMs:', differenceInMs)

        // Ensure pet.type is populated as PetType, not just ObjectId
        console.log('is update income:', differenceInMs >= petType?.time_natural)
        if (differenceInMs >= petType?.time_natural) {
          const now = new Date()
          let incomeCal = Math.floor((differenceInMs / petType?.time_natural) * petType?.income_per_claim)
          if (pet.total_income + incomeCal > petType?.max_income) {
            incomeCal = petType?.max_income - pet.total_income
          }
          pet.token_income += incomeCal
          pet.total_income += incomeCal
          pet.last_claim = now

          await pet.save()
          this.logger.log(
            `Pet ${petId} earned ${incomeCal} tokens. Total: ${pet.token_income}/${petType?.max_income_per_claim}`
          )
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
