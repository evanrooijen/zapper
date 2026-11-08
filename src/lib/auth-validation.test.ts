import { expect, test } from 'vitest'
import { loginSchema, registrationSchema } from './auth-validation'

const account = { name: 'Ada', email: 'ada@example.com', password: 'strong-password' }

test('registration rejects blank names, invalid email and short or oversized passwords', () => {
  expect(registrationSchema.safeParse(account).success).toBe(true)
  for (const invalid of [
    { name: '   ' }, { email: 'invalid' }, { password: 'short' }, { password: 'a'.repeat(129) },
  ]) {
    expect(registrationSchema.safeParse({ ...account, ...invalid }).success).toBe(false)
  }
})

test('login allows existing short passwords but rejects empty credentials', () => {
  expect(loginSchema.safeParse({ ...account, name: '', password: 'short' }).success).toBe(true)
  expect(loginSchema.safeParse({ ...account, password: '' }).success).toBe(false)
  expect(loginSchema.safeParse({ ...account, email: '' }).success).toBe(false)
})
