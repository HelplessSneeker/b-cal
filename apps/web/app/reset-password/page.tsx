import { Suspense } from "react"
import { Loading } from "@/components/ui/loading"
import { ResetPasswordForm } from "@/components/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Loading />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
