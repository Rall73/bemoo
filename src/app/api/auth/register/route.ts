import { forbidden } from "@/lib/api"

export async function POST() {
  return forbidden(
    "Cadastros de novas empresas estão temporariamente fechados. " +
    "Para acessar o bemoo, solicite um convite ao administrador da sua empresa."
  )
}
