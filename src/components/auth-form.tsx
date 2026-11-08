import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { loginSchema, registrationSchema } from '@/lib/auth-validation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register'
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: registering ? registrationSchema : loginSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = registering
          ? await authClient.signUp.email({ ...value, name: value.name.trim() })
          : await authClient.signIn.email({ email: value.email, password: value.password })
        if (result.error) {
          setError(result.error.message || 'Authentication failed. Please try again.')
          return
        }
        await navigate({ to: '/' })
      } catch {
        setError('Unable to connect. Please try again.')
      }
    },
  })
  const fields = registering
    ? (['name', 'email', 'password'] as const)
    : (['email', 'password'] as const)

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>{registering ? 'Create an account' : 'Welcome back'}</h1>
          </CardTitle>
          <CardDescription>
            {registering
              ? 'Enter your details to get started.'
              : 'Log in with your email and password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void form.handleSubmit()
            }}
          >
            <FieldGroup>
              {fields.map((name) => (
                <form.Field key={name} name={name}>
                  {(field) => {
                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={name}>
                          {name === 'name' ? 'Name' : name === 'email' ? 'Email' : 'Password'}
                        </FieldLabel>
                        <Input
                          id={name}
                          data-testid={`auth-${name}`}
                          name={name}
                          type={
                            name === 'password' ? 'password' : name === 'email' ? 'email' : 'text'
                          }
                          autoComplete={
                            name === 'password'
                              ? registering
                                ? 'new-password'
                                : 'current-password'
                              : name
                          }
                          required
                          minLength={name === 'password' && registering ? 8 : 1}
                          maxLength={name === 'password' ? 128 : name === 'name' ? 100 : undefined}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={invalid}
                          aria-describedby={invalid ? `${name}-error` : undefined}
                        />
                        {invalid && (
                          <FieldError id={`${name}-error`} errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
              ))}
              {error && (
                <Alert data-testid="auth-error" variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(submitting) => (
                  <Button data-testid="auth-submit" type="submit" disabled={submitting}>
                    {submitting && (
                      <LoaderCircle data-icon="inline-start" className="animate-spin" />
                    )}
                    {submitting ? 'Please wait…' : registering ? 'Create account' : 'Log in'}
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <p>
            {registering ? 'Already have an account?' : 'Need an account?'}{' '}
            <Link
              to={registering ? '/login' : '/register'}
              className="underline underline-offset-4"
            >
              {registering ? 'Log in' : 'Register'}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  )
}
