import { LoginForm } from "./LoginForm"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; novo?: string }>
}) {
  const { error, novo } = await searchParams
  return <LoginForm errorParam={error} novoCadastro={novo === "1"} />
}
