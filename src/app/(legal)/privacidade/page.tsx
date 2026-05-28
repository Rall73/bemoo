import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o bemoo coleta, usa e protege seus dados pessoais.",
}

const VERSION           = "1.0"
const ULTIMA_ATUALIZACAO = "28 de maio de 2026"
const CONTATO_DPO        = "privacidade@bemoo.net"

export default function PrivacidadePage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2" style={{ letterSpacing: "-0.02em" }}>
        Política de Privacidade
      </h1>
      <p className="text-sm text-gray-400 mb-10 flex items-center gap-2">
        <span className="font-mono bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded">v{VERSION}</span>
        Última atualização: {ULTIMA_ATUALIZACAO}
      </p>

      <Section title="1. Quem somos">
        <p>
          O <strong>bemoo</strong> é uma plataforma SaaS de gestão operacional desenvolvida e
          operada por Ricardo Luize (&ldquo;nós&rdquo;, &ldquo;nosso&rdquo;).
          Levamos a sério a proteção dos seus dados e cumprimos a{" "}
          <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
        </p>
        <p>
          Esta Política descreve como coletamos, usamos, armazenamos e protegemos
          suas informações ao usar o bemoo em <a href="https://bemoo.net">bemoo.net</a>.
        </p>
      </Section>

      <Section title="2. Dados que coletamos">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border border-gray-200 font-medium">Dado</th>
              <th className="text-left p-3 border border-gray-200 font-medium">Finalidade</th>
              <th className="text-left p-3 border border-gray-200 font-medium">Base legal (LGPD)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Nome e e-mail", "Criar e identificar sua conta", "Execução de contrato (art. 7º, V)"],
              ["Senha (hash bcrypt)", "Autenticar o acesso", "Execução de contrato (art. 7º, V)"],
              ["Nome da empresa e CNPJ", "Identificar o tenant na plataforma", "Execução de contrato (art. 7º, V)"],
              ["Endereço IP e logs de acesso", "Segurança e prevenção de fraudes", "Legítimo interesse (art. 7º, IX)"],
              ["Dados inseridos nos módulos", "Prestar o serviço contratado", "Execução de contrato (art. 7º, V)"],
              ["Cookies de sessão", "Manter o usuário autenticado", "Legítimo interesse (art. 7º, IX)"],
            ].map(([dado, finalidade, base]) => (
              <tr key={dado} className="border-b border-gray-100">
                <td className="p-3 border border-gray-200 font-medium text-gray-900">{dado}</td>
                <td className="p-3 border border-gray-200 text-gray-600">{finalidade}</td>
                <td className="p-3 border border-gray-200 text-gray-600">{base}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm text-gray-500">
          Não coletamos dados sensíveis (saúde, biometria, religião etc.) e não vendemos
          dados pessoais a terceiros.
        </p>
      </Section>

      <Section title="3. Como usamos seus dados">
        <ul>
          <li>Criar e gerenciar sua conta e a da sua empresa</li>
          <li>Prestar os serviços dos módulos contratados</li>
          <li>Enviar comunicações transacionais (confirmações, alertas, redefinição de senha)</li>
          <li>Detectar e prevenir acessos não autorizados</li>
          <li>Cumprir obrigações legais e regulatórias</li>
          <li>Melhorar a plataforma com base em métricas agregadas e anônimas</li>
        </ul>
        <p>
          <strong>Não usamos</strong> seus dados para publicidade de terceiros,
          perfilamento automatizado com impactos legais, ou qualquer finalidade
          incompatível com a descrita acima.
        </p>
      </Section>

      <Section title="4. Compartilhamento de dados">
        <p>
          Compartilhamos dados pessoais apenas nas seguintes situações:
        </p>
        <ul>
          <li>
            <strong>Prestadores de serviço essenciais:</strong> hospedagem (Hostinger),
            armazenamento de arquivos (Cloudinary), envio de e-mail (SMTP Hostinger).
            Todos operam sob contratos de sigilo.
          </li>
          <li>
            <strong>Obrigação legal:</strong> quando exigido por lei, ordem judicial ou
            autoridade competente.
          </li>
          <li>
            <strong>Com seu consentimento explícito</strong> para qualquer outra finalidade.
          </li>
        </ul>
      </Section>

      <Section title="5. Retenção de dados">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border border-gray-200 font-medium">Categoria</th>
              <th className="text-left p-3 border border-gray-200 font-medium">Prazo de retenção</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Dados de conta ativa", "Enquanto a conta estiver ativa"],
              ["Dados após cancelamento", "30 dias (período de recuperação), depois anonimizados"],
              ["Logs de auditoria", "5 anos (obrigação fiscal/legal)"],
              ["Tokens de redefinição de senha", "1 hora após criação, depois excluídos automaticamente"],
              ["Logs de acesso (IP)", "90 dias"],
            ].map(([cat, prazo]) => (
              <tr key={cat} className="border-b border-gray-100">
                <td className="p-3 border border-gray-200 font-medium text-gray-900">{cat}</td>
                <td className="p-3 border border-gray-200 text-gray-600">{prazo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="6. Seus direitos (LGPD)">
        <p>
          Você tem os seguintes direitos em relação aos seus dados pessoais,
          garantidos pelo art. 18 da LGPD:
        </p>
        <ul>
          <li><strong>Acesso:</strong> saber quais dados temos sobre você</li>
          <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados</li>
          <li><strong>Anonimização ou exclusão:</strong> solicitar a remoção de dados desnecessários</li>
          <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado (JSON)</li>
          <li><strong>Revogação do consentimento:</strong> quando o tratamento for baseado em consentimento</li>
          <li><strong>Oposição:</strong> se discordar de um tratamento baseado em legítimo interesse</li>
        </ul>
        <p>
          Para exercer seus direitos, acesse <strong>Configurações → Meus Dados</strong> na
          plataforma ou envie um e-mail para{" "}
          <a href={`mailto:${CONTATO_DPO}`}>{CONTATO_DPO}</a>.
          Responderemos em até <strong>15 dias úteis</strong>.
        </p>
      </Section>

      <Section title="7. Cookies">
        <p>
          Usamos apenas cookies estritamente necessários para o funcionamento da plataforma:
        </p>
        <ul>
          <li><strong>Cookie de sessão:</strong> mantém você autenticado durante o uso</li>
          <li><strong>Cookie de preferências:</strong> guarda o aceite desta política</li>
        </ul>
        <p>
          Não usamos cookies de rastreamento, publicidade ou analytics de terceiros.
          Você pode gerenciar cookies nas configurações do seu navegador.
        </p>
      </Section>

      <Section title="8. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados:
        </p>
        <ul>
          <li>Senhas armazenadas com hash bcrypt (custo 12)</li>
          <li>Comunicação criptografada via HTTPS/TLS</li>
          <li>Isolamento de dados por empresa (multi-tenant)</li>
          <li>Controle de acesso por perfil (ADMIN, GESTOR, EXECUTOR, AUDITOR)</li>
          <li>Logs de auditoria para todas as ações sensíveis</li>
          <li>Backups diários com retenção de 30 dias</li>
        </ul>
        <p>
          Em caso de incidente de segurança que possa afetar seus dados, notificaremos
          você e a ANPD dentro dos prazos legais.
        </p>
      </Section>

      <Section title="9. Transferência internacional">
        <p>
          Alguns serviços de infraestrutura podem processar dados fora do Brasil
          (ex.: Cloudinary — EUA). Nesses casos, exigimos que o prestador adote
          medidas adequadas de proteção equivalentes à LGPD.
        </p>
      </Section>

      <Section title="10. Encarregado de Dados (DPO)">
        <p>
          Nosso encarregado de proteção de dados pode ser contactado pelo e-mail:{" "}
          <a href={`mailto:${CONTATO_DPO}`}>{CONTATO_DPO}</a>.
        </p>
      </Section>

      <Section title="11. Alterações nesta política">
        <p>
          Podemos atualizar esta Política periodicamente. Quando houver mudanças
          relevantes, notificaremos por e-mail ou por aviso na plataforma com
          antecedência mínima de 15 dias. O uso contínuo da plataforma após
          a vigência da nova versão implica aceite das alterações.
        </p>
      </Section>

      <div className="mt-12 p-4 bg-primary-50 rounded-round border border-primary-100 text-sm text-primary-700">
        Dúvidas sobre esta Política? Fale conosco:{" "}
        <a href={`mailto:${CONTATO_DPO}`} className="font-medium underline">{CONTATO_DPO}</a>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4" style={{ letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}
