# CrisisTrace

**Digital Reputation Intelligence**

CrisisTrace é uma aplicação web educacional para investigação de crises de reputação digital. A plataforma transforma um estudo de caso em uma experiência interativa de auditoria, na qual equipes analisam registros, selecionam evidências, identificam riscos, produzem um diagnóstico e respondem a eventos inesperados durante a investigação.

O projeto foi desenvolvido a partir da atividade **Operação Raio-X de Reputação**, utilizando como cenário o caso fictício do **Clube Jacarandá do Norte do Extremo Sul**.

---

## Sobre o projeto

O CrisisTrace simula uma ferramenta de inteligência e auditoria de reputação digital.

Durante a atividade, cada equipe recebe acesso a um ambiente de investigação contendo registros de comunicação, publicações, logs e outros indícios relacionados a uma crise institucional.

O objetivo não é simplesmente encontrar uma publicação problemática, mas reconstruir a sequência dos acontecimentos e responder perguntas como:

- O que aconteceu?
- Quem foi afetado?
- Quais públicos estão envolvidos?
- O que os dados indicam?
- Quais foram as causas da crise?
- Qual é o problema aparente?
- Qual é o problema real?
- Qual deve ser o diagnóstico inicial?

Ao final da investigação, a equipe produz um **Relatório de Impacto Raio-X**.

---

## Cenário

O caso utilizado atualmente acompanha uma crise de reputação envolvendo o fictício **Clube Jacarandá do Norte do Extremo Sul**.

Após uma sequência de resultados esportivos negativos, uma publicação feita por um atleta desencadeia uma escalada de reações nas redes sociais.

A investigação inclui elementos como:

- publicações em redes sociais;
- posicionamentos institucionais;
- registros removidos ou recuperados;
- logs de comunicação;
- reação de torcedores;
- pressão de patrocinadores;
- dados de sentimento;
- impacto em vendas;
- comunicação interna;
- decisões de moderação;
- respostas da diretoria.

Os participantes precisam separar fatos relevantes de falsos indícios e construir uma interpretação fundamentada da crise.

---

## Principais funcionalidades

### Autenticação

A aplicação utiliza autenticação via Supabase.

Existem dois tipos principais de acesso:

**Salas A–G**

Utilizadas pelas equipes durante a atividade.

Após o login, o participante seleciona:

- período;
- grupo;
- início da investigação.

Cada início gera uma nova sessão independente.

**PROFESSORES**

Acesso especial destinado à demonstração e acompanhamento da atividade.

Esse perfil acessa diretamente o Dashboard, sem passar pela configuração de período e grupo.

---

### Dashboard de investigação

O Dashboard concentra os registros encontrados durante a auditoria.

Cada registro pode apresentar:

- código;
- data e horário;
- plataforma;
- autor;
- título;
- conteúdo;
- nível de risco;
- status;
- tags;
- nível de confiança;
- observações de auditoria;
- histórico de logs.

Também estão disponíveis filtros e pesquisa para auxiliar na análise.

---

### Classificação de risco

Os registros podem ser classificados como:

- `low`
- `medium`
- `high`
- `critical`

Essa classificação ajuda as equipes a priorizarem os acontecimentos mais relevantes da crise.

---

### Seleção de evidências

Os investigadores podem adicionar registros ao conjunto de evidências da investigação.

As evidências selecionadas permanecem associadas à investigação e são posteriormente utilizadas na elaboração do relatório.

---

## Missão 07 — Operação Escudo Imprevisto

Durante a investigação existe uma etapa especial de crise surpresa.

A missão simula uma nova manifestação pública de um atleta durante uma crise que já está em andamento.

O registro permanece restrito até que a missão seja desbloqueada.

O desbloqueio ocorre por meio de um código validado exclusivamente no backend.

Após o desbloqueio:

1. o registro restrito é revelado;
2. novos logs da crise ficam disponíveis;
3. a equipe pode analisar o impacto;
4. o registro pode ser adicionado às evidências;
5. o estado permanece persistido após atualização da página;
6. a evidência pode fazer parte do relatório final.

A implementação foi projetada para que o conteúdo restrito e o código de desbloqueio não precisem ficar expostos no bundle React.

---

## Relatório de investigação

Ao final da análise, a equipe preenche um relatório estruturado com oito dimensões:

1. O que aconteceu?
2. Pessoas afetadas
3. Públicos envolvidos
4. Dados encontrados
5. Causas
6. Problema aparente
7. Problema real
8. Diagnóstico inicial

O relatório possui persistência no banco e pode ser finalizado pela equipe.

Depois de finalizado, o relatório é protegido contra novas alterações.

---

## Geração de PDF

O CrisisTrace gera um documento final da investigação contendo informações como:

- identificação da investigação;
- diagnóstico produzido pela equipe;
- respostas do relatório;
- evidências selecionadas;
- registros relevantes;
- evidências provenientes da Missão 07.

A geração ocorre através de uma Supabase Edge Function.

---

## Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- CSS Modules

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security
- PostgreSQL RPC
- Supabase Edge Functions

### PDF

- pdf-lib

### Deploy

- Vercel — frontend
- Supabase — banco, autenticação e Edge Functions

---

## Arquitetura

```text
┌───────────────────────────────┐
│          CrisisTrace          │
│        React + Vite           │
│                               │
│ Login                         │
│ Session Setup                 │
│ Dashboard                     │
│ Audit Dossier                 │
│ Evidence Panel                │
│ Mission 07                    │
│ Investigation Report          │
└───────────────┬───────────────┘
                │
                │ Supabase Client
                ▼
┌───────────────────────────────┐
│           Supabase            │
│                               │
│ Auth                          │
│ PostgreSQL                    │
│ Row Level Security            │
│ RPC                           │
│ Edge Functions                │
│ Secrets                       │
└───────────────────────────────┘
```

---

## Estrutura principal

A estrutura pode variar conforme a evolução do projeto, mas os principais módulos estão organizados aproximadamente assim:

```text
src/
├── components/
│   ├── AuditDossier/
│   ├── EvidencePanel/
│   └── MissionUnlock/
│
├── lib/
│   ├── audit.ts
│   ├── classroomSession.ts
│   ├── investigation.ts
│   ├── mission.ts
│   ├── report.ts
│   └── supabase.ts
│
├── pages/
│   ├── Dashboard/
│   ├── InvestigationReport/
│   ├── Login/
│   └── SessionSetup/
│
└── types/
    ├── audit.ts
    └── report.ts
```

As Edge Functions ficam no diretório do Supabase:

```text
supabase/
└── functions/
    ├── generate-investigation-pdf/
    ├── get-mission-state/
    ├── toggle-mission-evidence/
    └── unlock-mission/
```

---

## Executando localmente

### Requisitos

- Node.js
- npm
- projeto configurado no Supabase

Clone o repositório:

```bash
git clone <URL_DO_REPOSITORIO>
cd crisis-trace
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo:

```text
.env
```

Configure:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Execute:

```bash
npm run dev
```

---

## Build

Para gerar a versão de produção:

```bash
npm run build
```

Para testar o build localmente:

```bash
npm run preview
```

---

## Variáveis de ambiente

### Frontend

As únicas credenciais do Supabase que devem ser utilizadas pelo frontend são:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

A publishable key é utilizada pelo cliente em conjunto com autenticação e políticas de acesso do Supabase.

### Backend / administração

Credenciais privilegiadas nunca devem ser adicionadas ao código React.

Exemplos:

```env
SUPABASE_SERVICE_ROLE_KEY=
MISSION_07_CODE=
CLASSROOM_PASSWORD=
```

Esses valores devem permanecer em ambientes seguros ou nos secrets das Edge Functions.

> Nunca utilize `SUPABASE_SERVICE_ROLE_KEY` no frontend.

---

## Segurança

O projeto utiliza diferentes camadas de controle:

- Supabase Auth;
- Row Level Security;
- validação de usuário;
- sessões de investigação;
- validação server-side da Missão 07;
- conteúdo restrito armazenado separadamente;
- secrets em Edge Functions;
- controle de acesso às investigações;
- proteção de relatórios finalizados.

O código de desbloqueio da Missão 07 não deve ser armazenado no frontend.

---

## Edge Functions

O projeto utiliza funções server-side para operações que não devem depender exclusivamente do navegador.

### `unlock-mission`

Valida o desbloqueio de uma missão restrita.

### `get-mission-state`

Retorna o estado da missão e libera o conteúdo restrito apenas quando a investigação possui autorização.

### `toggle-mission-evidence`

Adiciona ou remove uma evidência restrita da investigação.

### `generate-investigation-pdf`

Gera o relatório final em PDF, incluindo as evidências selecionadas.

---

## Deploy das Edge Functions

Com o Supabase CLI configurado:

```bash
npx supabase functions deploy unlock-mission
npx supabase functions deploy get-mission-state
npx supabase functions deploy toggle-mission-evidence
npx supabase functions deploy generate-investigation-pdf
```

Os secrets necessários devem ser configurados diretamente no Supabase.

Exemplo:

```bash
npx supabase secrets set MISSION_07_CODE=<CODIGO>
```

Não coloque o valor real do código no repositório.

---

## Deploy na Vercel

O frontend pode ser publicado diretamente na Vercel.

Configuração:

```text
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

Cadastre na Vercel:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Para permitir refresh em rotas do React Router, utilize um `vercel.json` na raiz:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Fluxo da aplicação

```text
Login
  │
  ├── PROFESSORES
  │       │
  │       └── Dashboard
  │
  └── Sala A–G
          │
          ▼
    Identificação da equipe
          │
          ├── Período
          └── Grupo
          │
          ▼
    Nova sessão
          │
          ▼
      Dashboard
          │
          ├── Auditoria
          ├── Dossiê
          ├── Evidências
          ├── Missão 07
          │
          ▼
       Relatório
          │
          ▼
          PDF
```

---

## Caso de uso educacional

O CrisisTrace foi pensado como ferramenta de apoio a atividades envolvendo:

- gestão de crise;
- comunicação institucional;
- reputação digital;
- relações públicas;
- comunicação esportiva;
- análise de stakeholders;
- tomada de decisão;
- interpretação de dados;
- estratégia de resposta;
- comunicação não violenta.

A interface procura colocar os participantes na posição de uma equipe de inteligência responsável por investigar e responder a uma crise em andamento.

---

## Status

**MVP funcional**

Atualmente estão implementados:

- [x] autenticação;
- [x] contas de sala;
- [x] acesso de professores;
- [x] identificação de período e grupo;
- [x] sessões independentes;
- [x] dashboard de auditoria;
- [x] pesquisa e filtros;
- [x] dossiê dos registros;
- [x] seleção de evidências;
- [x] persistência da investigação;
- [x] Missão 07 restrita;
- [x] desbloqueio server-side;
- [x] evidência restrita;
- [x] relatório estruturado;
- [x] finalização do relatório;
- [x] geração de PDF;
- [x] suporte a deploy na Vercel.

---

## Próximas evoluções possíveis

Algumas extensões naturais do projeto:

- painel de acompanhamento para professores;
- cronômetro das missões;
- novas crises surpresa;
- múltiplos estudos de caso;
- comparação entre diagnósticos das equipes;
- exportação consolidada dos resultados;
- métricas por grupo;
- dashboard pós-atividade;
- criação de casos por professores;
- revisão adicional das políticas de isolamento entre sessões.

---

## Aviso

O cenário, personagens, clube, publicações e acontecimentos utilizados na atividade são parte de um **estudo de caso educacional/simulado**.

O sistema não deve ser interpretado como ferramenta contendo dados reais do clube ou dos personagens apresentados no exercício.

---

## Licença

Defina a licença de acordo com a finalidade do projeto.

Para um projeto aberto de portfólio, uma opção comum é a licença MIT.

Caso os materiais pedagógicos ou o estudo de caso possuam regras próprias de distribuição, mantenha o código e o conteúdo educacional sob condições de uso separadas.