import Link from "next/link"
import { BemooLogo } from "@/components/Logo"
import { Lock } from "lucide-react"

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <BemooLogo size={32} color="#1F4E4A" />
        </div>

        <div className="bg-white rounded-round border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <Lock size={40} className="text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Cadastros fechados</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Os cadastros de novas empresas estão temporariamente desativados.
            Para acessar o bemoo, solicite um convite ao administrador da sua empresa.
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
