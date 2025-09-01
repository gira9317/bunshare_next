import { z } from 'zod'

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nullable(),
  avatar_img_url: z.string().url().nullable(),
  header_img_url: z.string().url().nullable(),
  bio: z.string().nullable(),
  website_url: z.array(z.string().url()).nullable(),
  public_profile: z.boolean(),
  follow_approval: z.boolean(),
  role: z.string(),
})

export type UserProfile = z.infer<typeof userProfileSchema>