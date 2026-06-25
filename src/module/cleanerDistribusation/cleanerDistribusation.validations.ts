import {z} from 'zod';


const cleanerDistributionsSchema=z.object({
      body: z.object({
            serviceId: z.string({required_error:"serviceId is required"})
      })
});

const cleanerDistributionsValidation={
      cleanerDistributionsSchema
}
export default cleanerDistributionsValidation