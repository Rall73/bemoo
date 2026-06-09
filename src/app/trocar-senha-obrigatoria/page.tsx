import { TrocarSenhaObrigatoriaForm } from "./_components/TrocarSenhaObrigatoriaForm"

export default function TrocarSenhaObrigatoriaPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
            Crie sua senha
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Sua conta foi criada com uma senha temporária.<br />
            Escolha uma senha definitiva para continuar.
          </p>
        </div>
        <TrocarSenhaObrigatoriaForm />
      </div>
    </div>
  )
}
