import { z } from 'zod'

export const loginSchema = z.object({
  name: z.string(),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.').max(128),
})

export const registrationSchema = loginSchema.extend({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
})

export const passwordChangeSchema = z.object({
  currentPassword: loginSchema.shape.password,
  newPassword: registrationSchema.shape.password,
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
})
