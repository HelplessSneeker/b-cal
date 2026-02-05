import { Suspense } from "react"
import { LoginForm } from "@/components/login-form"
import { Loading } from "@/components/ui/loading"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Loading />}>
          <LoginForm isSignup />
        </Suspense>
      </div>
    </div>
  )
}
