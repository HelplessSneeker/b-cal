"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils/utils"
import { login, signup } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "./ui/spinner"

interface LoginFormProps extends React.ComponentProps<"div"> {
  isSignup?: boolean
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters"
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one number"
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one symbol"
  }
  return null
}

export function LoginForm({
  className,
  isSignup = false,
  ...props
}: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSignup) {
      const passwordError = validatePassword(password)
      if (passwordError) {
        toast.error(passwordError)
        return
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match")
        return
      }
    }

    setIsLoading(true)

    const result = isSignup
      ? await signup(email, password)
      : await login(email, password)

    setIsLoading(false)

    if (result.success) {
      const redirectTo = searchParams.get("from") || "/"
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isSignup ? "Create an account" : "Login to your account"}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? "Enter your details below to create your account"
              : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                {!isSignup && (
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a
                      href="#"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                )}
                {isSignup && <FieldLabel htmlFor="password">Password</FieldLabel>}
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {isSignup && (
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>
              )}
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Spinner /> : isSignup ? "Sign Up" : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  {isSignup ? (
                    <>Already have an account? <a href="/login">Login</a></>
                  ) : (
                    <>Don&apos;t have an account? <a href="/signup">Sign up</a></>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
