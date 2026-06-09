import crypto from "crypto"

/**
 * Gera uma senha temporária de 10 caracteres.
 * Exclui letras/dígitos ambíguos (0/O, 1/l/I) para facilitar leitura.
 */
export function gerarSenhaTemporaria(): string {
  const upper  = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower  = "abcdefghjkmnpqrstuvwxyz"
  const digits = "23456789"
  const all    = upper + lower + digits

  const bytes = crypto.randomBytes(10)
  const chars: string[] = [
    upper[bytes[0]  % upper.length],   // garante >= 1 maiúscula
    digits[bytes[1] % digits.length],  // garante >= 1 dígito
  ]
  for (let i = 2; i < 10; i++) {
    chars.push(all[bytes[i] % all.length])
  }

  // Fisher-Yates shuffle
  const shuffle = crypto.randomBytes(chars.length)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}
