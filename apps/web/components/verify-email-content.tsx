"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { verifyEmail, refreshToken } from "@/lib/api/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  )
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!token) return

    verifyEmail(token).then(async (result) => {
      if (result.success) {
        await refreshToken()
        setStatus("success")
        router.push("/")
      } else {
        setStatus("error")
        setErrorMessage(result.error || "Verification failed")
      }
    })
  }, [token, router])

  if (status === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying your email</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email verified</CardTitle>
          <CardDescription>
            Your email has been verified. Redirecting...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification failed</CardTitle>
        <CardDescription>
          {token
            ? errorMessage || "This verification link is invalid or has expired."
            : "No verification token provided."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <a href="/login" className="text-sm underline-offset-4 hover:underline">
          Back to login
        </a>
      </CardContent>
    </Card>
  )
}
