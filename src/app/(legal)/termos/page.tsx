import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos e condições de uso da plataforma bemoo.",
}

const VERSION           = "1.0"
const ULTIMA_ATUALIZACAO = "28 de maio de 2026"
const CONTATO            = "contato@bemoo.com.br"

export default function TermosPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2" style={{ letterSpacing: "-0.02em" }}>
        Termos de Uso
      </h1>
      <p className="text-sm text-gray-400 mb-10 flex items-center gap-2">
        <span className="font-mono bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded">v{VERSION}</span>
        Última atualização: {ULTIMA_ATUALIZACAO}
      </p>

      <Section title="1. Aceitação dos termos">
        <p>
          Ao criar uma conta ou usar o <strong>bemoo</strong> (&ldquo;Plataforma&rdquo;,
          &ldquo;Serviço&rdquo;), você (&ldquo;Usuário&rdquo;, &ldquo;Empresa&rdquo;)
          concorda com estes Termos de Uso e com nossa{" "}
          <a href="/privacidade">Política de Privacidade</a>.
          Se não concordar, não utilize a plataforma.
        </p>
      </Section>

      <Section title="2. O serviço">
        <p>
          O bemoo é uma plataforma SaaS de gestão operacional que oferece, conforme
          o plano contratado, os módulos:
        </p>
        <ul>
          <li><strong>Checklists</strong> — listas de verificação operacionais</li>
          <li><strong>Intercorrências</strong> — registro e acompanhamento de eventos</li>
          <li><strong>Rastreabilidade</strong> — controle de ativos e equipamentos</li>
          <li><strong>Planos de Ação</strong> — gestão de ações corretivas e preventivas</li>
          <li><strong>Captura</strong> — demandas, tarefas e ideias</li>
        </ul>
        <p>
          Nos reservamos o direito de adicionar, modificar ou descontinuar módulos
          com aviso prévio de <strong>30 dias</strong>.
        </p>
      </Section>

      <Section title="3. Cadastro e conta">
        <ul>
          <li>Você deve ter capacidade legal para contratar (18 anos ou representante legal de empresa)</li>
          <li>As informações fornecidas no cadastro devem ser verdadeiras e atualizadas</li>
          <li>Você é responsável pela confidencialidade da sua senha e por todas as atividades realizadas na sua conta</li>
          <li>Uma conta por empresa; múltiplos usuários são gerenciados pelo administrador da conta</li>
          <li>Notifique-nos imediatamente em caso de acesso não autorizado: <a href={`mailto:${CONTATO}`}>{CONTATO}</a></li>
        </ul>
      </Section>

      <Section title="4. Uso aceitável">
        <p>Você concorda em usar a plataforma apenas para fins lícitos e em conformidade com estes Termos. É proibido:</p>
        <ul>
          <li>Usar o serviço para atividades ilegais, fraudulentas ou prejudiciais a terceiros</li>
          <li>Tentar acessar contas de outras empresas ou dados não autorizados</li>
          <li>Realizar engenharia reversa, descompilar ou copiar o código da plataforma</li>
          <li>Inserir conteúdo que viole direitos autorais, marcas ou privacidade de terceiros</li>
          <li>Realizar testes de carga, varreduras ou ataques à infraestrutura sem autorização prévia</li>
          <li>Fazer scraping ou coleta automatizada de dados da plataforma</li>
        </ul>
      </Section>

      <Section title="5. Planos e pagamento">
        <p>
          O bemoo oferece planos gratuitos e pagos. As condições específicas de cada plano
          (limites de usuários, módulos e armazenamento) estão disponíveis na página de preços.
        </p>
        <ul>
          <li>Planos pagos são cobrados antecipadamente (mensal ou anual)</li>
          <li>Não há reembolso proporcional em caso de cancelamento antecipado, salvo disposição contrária na legislação aplicável</li>
          <li>O não pagamento por mais de 15 dias pode resultar na suspensão do acesso</li>
          <li>Os preços podem ser reajustados com aviso prévio de <strong>30 dias</strong></li>
        </ul>
      </Section>

      <Section title="6. Dados e propriedade intelectual">
        <p>
          <strong>Seus dados são seus.</strong> Você mantém todos os direitos sobre os dados
          inseridos na plataforma. Concede-nos apenas a licença necessária para prestar o serviço.
        </p>
        <p>
          O bemoo — marca, código, interface, identidade visual — é propriedade exclusiva
          do desenvolvedor. Nenhuma parte destes Termos transfere direitos de propriedade
          intelectual ao Usuário.
        </p>
      </Section>

      <Section title="7. Disponibilidade e SLA">
        <p>
          Buscamos manter a plataforma disponível 24/7, mas não garantimos disponibilidade
          ininterrupta. Manutenções programadas serão comunicadas com antecedência mínima de
          24 horas.
        </p>
        <p>
          O bemoo não se responsabiliza por perdas decorrentes de interrupções fora do
          nosso controle (falhas de infraestrutura de terceiros, desastres naturais,
          ataques cibernéticos em larga escala).
        </p>
      </Section>

      <Section title="8. Limitação de responsabilidade">
        <p>
          Na máxima extensão permitida pela lei, o bemoo não será responsável por:
        </p>
        <ul>
          <li>Danos indiretos, incidentais ou lucros cessantes</li>
          <li>Perda de dados causada por uso indevido da conta pelo próprio usuário</li>
          <li>Decisões operacionais tomadas com base nos dados inseridos na plataforma</li>
        </ul>
        <p>
          Nossa responsabilidade total não excederá o valor pago pelo serviço nos
          últimos 3 meses.
        </p>
      </Section>

      <Section title="9. Suspensão e cancelamento">
        <p>
          <strong>Pelo Usuário:</strong> você pode cancelar sua conta a qualquer momento
          em Configurações → Minha Conta. Os dados ficam disponíveis por 30 dias após
          o cancelamento para exportação.
        </p>
        <p>
          <strong>Por nós:</strong> podemos suspender ou encerrar contas que violem
          estes Termos, com ou sem aviso prévio conforme a gravidade da infração.
          Em caso de encerramento por nossa iniciativa sem justa causa, reembolsaremos
          o valor proporcional ao período não utilizado.
        </p>
      </Section>

      <Section title="10. Privacidade">
        <p>
          O tratamento dos seus dados pessoais é regido pela nossa{" "}
          <a href="/privacidade">Política de Privacidade</a>, parte integrante
          destes Termos.
        </p>
      </Section>

      <Section title="11. Alterações nos termos">
        <p>
          Podemos atualizar estes Termos. Alterações relevantes serão comunicadas com
          <strong> 15 dias de antecedência</strong> por e-mail ou aviso na plataforma.
          O uso contínuo após a vigência implica aceite da nova versão.
        </p>
      </Section>

      <Section title="12. Lei aplicável e foro">
        <p>
          Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da
          comarca de domicílio do Usuário para dirimir quaisquer controvérsias,
          salvo acordo em contrário.
        </p>
      </Section>

      <div className="mt-12 p-4 bg-primary-50 rounded-round border border-primary-100 text-sm text-primary-700">
        Dúvidas? Fale conosco:{" "}
        <a href={`mailto:${CONTATO}`} className="font-medium underline">{CONTATO}</a>
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
