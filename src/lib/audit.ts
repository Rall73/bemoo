import { prisma } from "@/lib/prisma"

// ─── Ações auditadas ─────────────────────────────────────────────────

export type AuditAction =
  // Autenticação
  | "login"
  | "logout"
  // Usuários
  | "usuario.criado"
  | "usuario.criado_direto"
  | "usuario.editado"
  | "usuario.desativado"
  | "usuario.role_alterado"
  | "usuario.senha_resetada"
  // Convites
  | "convite.enviado"
  | "convite.reenviado"
  | "convite.cancelado"
  | "convite.aceito"
  // Empresa (plataforma admin)
  | "empresa.criada"
  | "empresa.editada"
  | "empresa.suspensa"
  | "empresa.reativada"
  // Módulos (plataforma admin)
  | "modulo.habilitado"
  | "modulo.desabilitado"
  | "modulo.acesso_concedido"
  | "modulo.acesso_revogado"
  // Legal
  | "legal.aceito"
  // Senha
  | "senha.reset_solicitado"
  | "senha.reset_concluido"
  | "senha.trocada_obrigatoria"
  // Checklists
  | "checklist.executado"
  | "checklist.excluido"
  | "checklist.importado_template"
  // Oficina — master data
  | "oficina.area.criada"
  | "oficina.area.editada"
  | "oficina.area.removida"
  | "oficina.produto.criado"
  | "oficina.produto.editado"
  | "oficina.produto.removido"
  | "oficina.material.criado"
  | "oficina.material.editado"
  | "oficina.material.removido"
  | "oficina.pausa_motivo.criado"
  | "oficina.pausa_motivo.editado"
  | "oficina.pausa_motivo.removido"
  // Oficina — ordens de serviço
  | "oficina.pedido.criado"
  | "oficina.pedido.status_alterado"
  | "oficina.pedido.entrega_parcial"
  | "oficina.pedido.cancelado"
  // Oficina — estoque
  | "oficina.consumo.registrado"
  | "oficina.consumo.removido"

// ─── Helper principal ─────────────────────────────────────────────────

interface LogParams {
  companyId: number
  userId:    number
  action:    AuditAction
  entity?:   string
  entityId?: number
  before?:   unknown
  after?:    unknown
  ip?:       string | null
}

/**
 * Registra uma ação no audit_log.
 * Nunca lança — erros são silenciosos para não bloquear a operação principal.
 */
export async function logAction(params: LogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId:     params.companyId,
        userId:        params.userId,
        action:        params.action,
        entity:        params.entity    ?? null,
        entityId:      params.entityId  ?? null,
        payloadBefore: params.before !== undefined ? JSON.stringify(params.before) : null,
        payloadAfter:  params.after  !== undefined ? JSON.stringify(params.after)  : null,
        ip:            params.ip        ?? null,
      },
    })
  } catch (err) {
    console.error("[Audit] Falha ao registrar log:", err)
  }
}

// ─── Utilitário de IP ─────────────────────────────────────────────────

/** Extrai o IP real da requisição (suporta proxy / Hostinger). */
export function getIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null
  )
}

/** @deprecated Use getIp() */
export const getClientIp = getIp
