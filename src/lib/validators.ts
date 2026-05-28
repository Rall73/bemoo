import { z } from "zod"

// ─── Primitivos reutilizáveis ─────────────────────────────────────

export const zEmail = z
  .string()
  .min(1, "E-mail obrigatório")
  .email("E-mail inválido")
  .toLowerCase()

export const zSenha = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número")

export const zNome = z
  .string()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(191, "Nome muito longo")
  .trim()

export const zId = z
  .number({ error: "ID inválido" })
  .int()
  .positive()

export const zIdParam = z
  .string()
  .regex(/^\d+$/, "ID inválido")
  .transform(Number)

// ─── Auth ─────────────────────────────────────────────────────────

export const zLoginSchema = z.object({
  email:    zEmail,
  password: z.string().min(1, "Senha obrigatória"),
})

export const zCadastroSchema = z.object({
  empresa:   zNome,
  email:     zEmail,
  password:  zSenha,
  termos:    z.literal(true, { error: "Você deve aceitar os termos de uso" }),
})

export const zConviteSchema = z.object({
  email: zEmail,
  role:  z.enum(["ADMIN", "GESTOR", "EXECUTOR", "AUDITOR"]),
})

export const zResetSenhaSchema = z.object({
  email: zEmail,
})

export const zNovaSenhaSchema = z
  .object({
    token:    z.string().min(1),
    password: zSenha,
    confirm:  z.string().min(1),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  })

// ─── Empresa ──────────────────────────────────────────────────────

export const zEmpresaSchema = z.object({
  name:     zNome,
  document: z.string().optional(),
  email:    zEmail,
})

// ─── Usuário ──────────────────────────────────────────────────────

export const zUsuarioUpdateSchema = z.object({
  name: zNome.optional(),
  role: z.enum(["ADMIN", "GESTOR", "EXECUTOR", "AUDITOR"]).optional(),
})

// ─── Upload ───────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
] as const

export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

// ─── Tipos inferidos ──────────────────────────────────────────────

export type LoginInput      = z.infer<typeof zLoginSchema>
export type CadastroInput   = z.infer<typeof zCadastroSchema>
export type ConviteInput    = z.infer<typeof zConviteSchema>
export type EmpresaInput    = z.infer<typeof zEmpresaSchema>
