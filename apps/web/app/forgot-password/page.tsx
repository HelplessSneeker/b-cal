"use client"

import { useState } from "react"
import { forgotPassword } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await forgotPassword(email)
    setIsLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              {submitted
                ? "If that email exists, we sent a reset link."
                : "Enter your email to receive a password reset link."}
            </CardDescription>
          </CardHeader>
          {!submitted && (
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
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? <Spinner /> : "Send reset link"}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          )}
          {submitted && (
            <CardContent>
              <a href="/login" className="text-sm underline-offset-4 hover:underline">
                Back to login
              </a>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
