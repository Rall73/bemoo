# bemoo — Guia de Versionamento de Documentos Legais

> **Leia este documento inteiro antes de publicar qualquer atualização.**
> Uma publicação errada exige aceite de todos os usuários no próximo acesso —
> não há como desfazer sem intervenção no banco.

---

## Como o sistema funciona

O bemoo usa dois conceitos separados para documentos legais:

| Conceito | Onde vive | Responsabilidade |
|---|---|---|
| **Conteúdo do documento** | Arquivo estático em `src/app/(legal)/` | O que o usuário lê |
| **Versão do documento** | Tabela `legal_versions` no banco | Controle de aceite |

Os dois precisam estar **sempre sincronizados**. Publicar uma nova versão no banco
sem atualizar o texto da página (ou vice-versa) cria inconsistência.

### Tabelas envolvidas

```
legal_versions
  id           INT       — ID único da versão
  type         ENUM      — 'TERMS' ou 'PRIVACY'
  version      VARCHAR   — ex: "1.0", "1.1", "2.0"
  summary      TEXT      — resumo do que mudou (exibido no LegalGate ao usuário)
  effective_at DATETIME  — quando esta versão entra em vigor
  created_at   DATETIME  — quando foi publicada no sistema
  created_by   INT       — ID do usuário platform_admin que publicou

legal_acceptances
  id                INT       — ID do aceite
  user_id           INT       — quem aceitou
  legal_version_id  INT       — qual versão foi aceita
  accepted_at       DATETIME  — quando aceitou
  ip                VARCHAR   — IP no momento do aceite
```

### O que acontece quando uma nova versão é publicada

1. A nova versão entra na tabela `legal_versions`.
2. Na próxima vez que um usuário autenticado acessa qualquer página do app,
   o sistema compara as versões ativas com as que ele já aceitou.
3. Se houver pendência, ele vê o **LegalGate** — uma tela de bloqueio suave
   que mostra cada documento pendente com o resumo das mudanças.
4. O usuário lê (há um link "Ler documento completo ↗") e marca o checkbox.
5. Ao confirmar, o aceite é gravado em `legal_acceptances` com timestamp e IP.
6. O app é liberado normalmente.

---

## Quando publicar uma nova versão

### Casos que EXIGEM nova versão

| Situação | Tipo | Versão sugerida |
|---|---|---|
| Adição de novo módulo que trata dados diferentes | TERMS + PRIVACY | +minor (ex: 1.0 → 1.1) |
| Mudança nos prazos de retenção de dados | PRIVACY | +minor |
| Novo compartilhamento com terceiros (ex: Z-API, Sentry) | PRIVACY | +minor |
| Mudança na política de reembolso ou cancelamento | TERMS | +minor |
| Mudança de jurisdição ou foro | TERMS | +major (ex: 1.x → 2.0) |
| Reestruturação completa do documento | TERMS ou PRIVACY | +major |

### Casos que NÃO exigem nova versão

- Correção de erro tipográfico ou gramatical
- Melhoria de clareza sem mudança de conteúdo
- Atualização de endereço de e-mail de contato

Para esses casos: edite o arquivo estático, atualize a data de revisão,
mas **não publique nova versão no banco e não incremente** `VERSION`.

---

## Passo a passo: publicar nova versão

### Pré-requisito: aviso aos usuários

A cláusula 11 dos Termos e a seção 11 da Política exigem **15 dias de aviso prévio**
para alterações relevantes. Use o mecanismo de `effective_at` para agendar a entrada
em vigor com antecedência, comunicando por e-mail antes.

---

### Passo 1 — Atualizar o texto do documento

Abra o arquivo da página correspondente:

- **Termos de Uso:** `src/app/(legal)/termos/page.tsx`
- **Política de Privacidade:** `src/app/(legal)/privacidade/page.tsx`

Faça as alterações no conteúdo JSX. Depois, atualize as duas constantes no topo do arquivo:

```tsx
// Exemplo: publicando Termos v1.1
const VERSION            = "1.1"             // ← incrementar
const ULTIMA_ATUALIZACAO = "15 de julho de 2026"  // ← nova data
```

**Regra:** `VERSION` no arquivo deve sempre corresponder à versão mais recente
publicada no banco para aquele tipo de documento.

---

### Passo 2 — Publicar a versão no banco

Você tem **duas formas** de fazer isso:

#### Forma A — Via API (recomendada para platform admins)

Faça login com uma conta `platformAdmin = true` e envie a requisição:

```http
POST https://bemoo.net/api/legal/versions
Content-Type: application/json

{
  "type": "TERMS",
  "version": "1.1",
  "summary": "Atualizamos a cláusula 5 (Planos e Pagamento): incluída política de reembolso de 7 dias para cancelamentos no primeiro mês. Adicionado módulo WhatsApp na lista de serviços (cláusula 2).",
  "effectiveAt": "2026-07-15T00:00:00-03:00"
}
```

Campos do body:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `type` | Sim | `"TERMS"` ou `"PRIVACY"` |
| `version` | Sim | String livre, ex: `"1.1"`, `"2.0"`. Deve ser única por tipo. |
| `summary` | Sim | Mínimo 10 chars. **Texto que o usuário vê no LegalGate** — seja claro e objetivo. |
| `effectiveAt` | Não | ISO 8601 com offset. Se omitido, entra em vigor imediatamente. |

A API retorna a versão criada em caso de sucesso (`200 ok`).

Se tentar publicar uma `version` que já existe para aquele `type`, a API retorna
`400 badRequest` com mensagem de erro — sem efeito no banco.

#### Forma B — Via phpMyAdmin (alternativa manual)

Acesse o phpMyAdmin no painel da Hostinger, banco `u822347350_bemoo`,
e execute o SQL:

```sql
INSERT INTO legal_versions (type, version, summary, effective_at, created_by)
VALUES (
  'TERMS',
  '1.1',
  'Atualizamos a cláusula 5 (Planos e Pagamento): incluída política de reembolso de 7 dias para cancelamentos no primeiro mês.',
  '2026-07-15 00:00:00',   -- horário em UTC (Brasília = UTC-3, então 00:00 BRT = 03:00 UTC)
  1                         -- ID do usuário platform_admin
);
```

> **Atenção ao fuso:** o banco armazena em UTC. Se quiser vigência às 00:00 BRT,
> insira `03:00:00` no campo `effective_at`.

---

### Passo 3 — Verificar localmente

Antes de fazer push, rode o build:

```bash
npx tsc --noEmit
npx next build
```

Os dois devem passar sem erro.

---

### Passo 4 — Commit e deploy

Stage apenas os arquivos alterados (nunca `git add -A`):

```bash
# Exemplo: publicando Termos v1.1
git add src/app/(legal)/termos/page.tsx

git commit -m "$(cat <<'EOF'
docs(legal): Termos de Uso v1.1 — política de reembolso e módulo WhatsApp

Atualiza cláusula 5: reembolso proporcional em até 7 dias para cancelamentos
no primeiro mês. Cláusula 2: adiciona módulo WhatsApp à lista de serviços.
Vigência: 15/07/2026.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"

git push origin main
```

A Hostinger reconstrói em alguns minutos. Após o deploy, todos os usuários
que acessarem o app e ainda não tiverem aceitado a nova versão verão o LegalGate.

---

### Passo 5 — Publicar a versão no banco em produção

Se você usou a **Forma A** (API), já está feito.

Se preferir fazer via phpMyAdmin após o deploy, execute o SQL do Passo 2 agora.

> O código e o banco devem ser atualizados no mesmo deploy (ou o mais próximo possível).
> Usuários não serão bloqueados se a versão do banco ainda não existir — o LegalGate
> só aparece quando o banco registra uma versão pendente.

---

## Atualizar os dois documentos ao mesmo tempo

Se TERMS e PRIVACY mudam juntos (ex: adição de novo serviço de terceiros
que impacta ambos), publique as duas versões:

```http
POST /api/legal/versions
{ "type": "TERMS",   "version": "1.2", "summary": "...", "effectiveAt": "..." }

POST /api/legal/versions
{ "type": "PRIVACY", "version": "1.1", "summary": "...", "effectiveAt": "..." }
```

O LegalGate agrupa tudo em uma única tela — o usuário aceita os dois de uma vez
com checkboxes separados por documento.

---

## Consultar o histórico de aceites

### Verificar versões ativas no momento

```sql
SELECT type, version, summary, effective_at
FROM legal_versions
WHERE effective_at <= NOW()
ORDER BY type, effective_at DESC;
```

### Verificar se um usuário específico aceitou as versões atuais

```sql
-- Substitua 42 pelo ID do usuário
SELECT
  lv.type,
  lv.version,
  la.accepted_at,
  la.ip
FROM legal_versions lv
LEFT JOIN legal_acceptances la
  ON la.legal_version_id = lv.id AND la.user_id = 42
WHERE lv.effective_at <= NOW()
ORDER BY lv.type, lv.effective_at DESC;
```

### Listar todos os aceites de uma versão específica

```sql
-- Substitua 3 pelo ID da versão
SELECT
  u.name,
  u.email,
  la.accepted_at,
  la.ip
FROM legal_acceptances la
JOIN users u ON u.id = la.user_id
WHERE la.legal_version_id = 3
ORDER BY la.accepted_at;
```

### Usuários que ainda NÃO aceitaram a versão mais recente

```sql
-- Útil antes do effective_at para disparar e-mail de aviso prévio
SELECT u.id, u.name, u.email
FROM users u
WHERE u.deleted_at IS NULL
  AND u.id NOT IN (
    SELECT la.user_id
    FROM legal_acceptances la
    WHERE la.legal_version_id = (
      -- Substitua 'TERMS' por 'PRIVACY' se precisar
      SELECT id FROM legal_versions
      WHERE type = 'TERMS'
        AND effective_at <= NOW()
      ORDER BY effective_at DESC
      LIMIT 1
    )
  );
```

---

## Convenção de numeração de versões

```
MAJOR.MINOR

MAJOR — mudança que altera direitos ou obrigações fundamentais
         ex: mudança de jurisdição, novo modelo de cobrança
MINOR — adição, remoção ou alteração de cláusula/seção
         ex: novo módulo listado, novo prazo, novo parceiro
```

Exemplos de progressão:

```
1.0  → versão inicial
1.1  → adicionado módulo WhatsApp na cláusula de serviços
1.2  → ajuste no prazo de retenção de logs
2.0  → reestruturação completa ou mudança de jurisdição
```

---

## Fluxo completo ilustrado

```
Decisão de atualizar documento
        │
        ├── É correção tipográfica/gramatical?
        │   ├── SIM → Editar arquivo estático, atualizar data, NÃO incrementar VERSION
        │   └── NÃO → continua ▼
        │
        ▼
Redigir novo texto (arquivo estático)
Incrementar VERSION + ULTIMA_ATUALIZACAO no arquivo
        │
        ▼
Comunicar usuários por e-mail (15 dias antes, se possível)
        │
        ▼
Publicar versão no banco (API POST /api/legal/versions com effectiveAt futuro)
        │
        ▼
Commit + push do arquivo da página (next build antes do push)
        │
        ▼
Na data de effective_at: versão entra em vigor automaticamente
        │
        ▼
Usuários veem LegalGate no próximo acesso ao app
Aceites gravados em legal_acceptances com timestamp + IP
```

---

## Referência rápida de arquivos

| O que alterar | Arquivo |
|---|---|
| Texto dos Termos de Uso | `src/app/(legal)/termos/page.tsx` |
| Texto da Política de Privacidade | `src/app/(legal)/privacidade/page.tsx` |
| Lógica de verificação de pendências | `src/lib/legal.ts` |
| Tela de aceite (LegalGate) | `src/app/(app)/_components/LegalGate.tsx` |
| Verificação no layout do app | `src/app/(app)/layout.tsx` |
| API de aceite | `src/app/api/legal/accept/route.ts` |
| API de publicação de versão | `src/app/api/legal/versions/route.ts` |
