import { Suspense } from "react"
import { BemooLogo } from "@/components/Logo"
import { ResetContent } from "./ResetContent"

export const metadata = {
  title: "Redefinir senha",
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <BemooLogo size={32} color="#1F4E4A" />
        </div>

        <div className="bg-white rounded-round border border-gray-200 p-8">
          {/* Suspense obrigatório para useSearchParams no Next.js 16 */}
          <Suspense fallback={
            <div className="flex justify-center py-8">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }>
            <ResetContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
