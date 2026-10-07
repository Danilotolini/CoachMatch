# Arquitetura do CoachMatch

Visão geral de como as peças do sistema se conectam. O modelo completo está em [`docs/c4/workspace.dsl`](../c4/workspace.dsl) (Structurizr DSL) — veja o [README da raiz](../../README.md) para instruções de como visualizá-lo localmente.

## Diagrama de Contexto (C1)

CoachMatch e os sistemas com que se integra.

```mermaid
C4Context
    title Contexto do Sistema — CoachMatch (C1)

    Person(aluno, "Aluno", "Busca treinadores, agenda sessões, paga e conversa.")
    Person(coach, "Coach", "Gerencia agenda e perfil, conversa com alunos.")

    System(coachMatch, "CoachMatch", "PWA que conecta alunos a treinadores: busca, agendamento, pagamento e chat.")

    System_Ext(cognito, "Amazon Cognito", "2 User Pools: CoachAccess (treinadores) e StudentAccess (alunos).")
    System_Ext(stream, "Stream Chat", "Chat em tempo real como serviço.")
    System_Ext(google, "Google Identity", "Login social federado via Cognito.")

    Rel(aluno, coachMatch, "Busca, agenda, paga e conversa", "HTTPS")
    Rel(coach, coachMatch, "Gerencia agenda, perfil e conversa", "HTTPS")
    Rel(coachMatch, cognito, "Autentica usuários / valida JWT", "OIDC / JWT")
    Rel(coachMatch, stream, "Chat 1:1 aluno↔coach", "HTTPS / WebSocket")
    Rel(cognito, google, "Login social federado", "OAuth 2.0")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Diagrama de Contêineres (C2)

Os principais componentes de execução do sistema.

```mermaid
C4Container
    title Contêineres — CoachMatch (C2)

    Person(aluno, "Aluno")
    Person(coach, "Coach")

    System_Ext(stream, "Stream Chat", "Chat em tempo real.")
    System_Ext(google, "Google Identity", "Login social.")

    System_Boundary(cm, "CoachMatch") {
        Container(cf, "CloudFront + S3", "AWS CloudFront · S3", "Hospeda e distribui globalmente o build estático do PWA.")
        Container(pwa, "PWA React", "React · Vite · TypeScript", "Interface instalável para alunos e coaches.")
        Container(api, "HTTP API", "Amazon API Gateway (HTTP)", "Roteamento de rotas e autorização JWT via Cognito.")
        Container(lambdas, "Lambdas de Domínio", "Node.js · AWS Lambda", "Coaches, Alunos, Schedule, Payments, Chat, Gyms/Especialidades, Upload.")
        ContainerDb(dynamo, "DynamoDB", "Amazon DynamoDB", "5 tabelas: coaches, students, schedule, payments, gyms.")
        Container(cognito, "Cognito (2 pools)", "Amazon Cognito", "CoachAccess para treinadores, StudentAccess para alunos.")
        Container(s3, "S3 Mídia", "Amazon S3", "Fotos e vídeos de perfil (upload direto via URL pré-assinada).")
        Container(sqsm, "SQS MailSender", "Amazon SQS", "Eventos de agendamento para envio de e-mails.")
        Container(sqsp, "SQS payment.succeeded", "Amazon SQS", "Evento pós-pagamento; consumido pelo domínio Schedule.")
    }

    Rel(aluno, cf, "Acessa a plataforma", "HTTPS")
    Rel(coach, cf, "Acessa a plataforma", "HTTPS")
    Rel(cf, pwa, "Serve arquivos estáticos do PWA")
    Rel(pwa, api, "Chamadas de API", "HTTPS / JSON")
    Rel(pwa, cognito, "Login e renovação de tokens", "OIDC")
    Rel(pwa, stream, "Chat em tempo real", "WebSocket")
    Rel(api, cognito, "Valida JWT nas rotas autenticadas", "JWT")
    Rel(api, lambdas, "Invoca funções por rota", "AWS Invoke")
    Rel(lambdas, dynamo, "Persiste e lê dados", "AWS SDK")
    Rel(lambdas, s3, "Gera URLs pré-assinadas", "AWS SDK")
    Rel(lambdas, sqsm, "Emite eventos de agenda", "AWS SDK")
    Rel(lambdas, sqsp, "Emite / consome payment.succeeded", "AWS SDK")
    Rel(lambdas, stream, "Emite tokens e gerencia canais", "HTTPS")
    Rel(cognito, google, "Login social", "OAuth 2.0")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
```

> **Não implantados:** Validador CREF-SP e Agendador CREF estão modelados no DSL mas não foram entregues (ver SCRUM-5). O Gateway de Pagamento externo também está modelado mas ainda não integrado — o domínio `payments` usa cartões e PIX simulados.

## Componentes por domínio

| Domínio | Código em | Lambda(s) | Tabela DynamoDB |
| --- | --- | --- | --- |
| **Coaches** | `src/coaches/` | `coachGetMe`, `coachUpdateMe`, `coachCreate` (Cognito Trigger) | `coaches` |
| **Alunos** | `src/students/` | `studentGetProfile`, `studentUpdateProfile`, `studentUpdateHealth`, `studentCreate` (Cognito Trigger) | `students` |
| **Academias** | `src/gyms/` | `getGyms`, `postGymsSuggest` | `gyms` |
| **Especialidades** | `src/specialties/` | `getSpecialties` | `specialties` |
| **Agendamentos** | `src/schedule/` | `getCoachSchedule`, `postCoachSchedule`, `postScheduleRequest`, `postApproveSchedule`, `postCancelSchedule`, `postClassStatus`, `on-payment-succeeded` | `schedule` |
| **Pagamentos** | `src/payments/` | `createPayment`, `getPayment`, `refundPayment` | `payments` |
| **Chat** | `src/api-chat/` | `chatToken`, `chatConversationCreate`, `chatConversationList`, `chatMessageSend`, `chatMessageList` (e outros) | — (Stream Chat) |
| **Upload** | `src/upload/` | `generateUploadUrl` | — (S3) |

**Nota sobre o chat:** diferente dos outros domínios, `api-chat` não persiste dados no DynamoDB — delega tudo ao Stream Chat. Ver [Fluxo de chat](chat-workflow.md).

## Fluxos de domínio

| Domínio | Documento |
| --- | --- |
| Agendamentos | [schedule-workflow.md](schedule-workflow.md) |
| Pagamentos | [payments-workflow.md](payments-workflow.md) |
| Chat | [chat-workflow.md](chat-workflow.md) |

## Decisões de arquitetura (ADRs)

| ADR | Decisão |
| --- | --- |
| [0001](../ADRs/0001-adocao-de-arquitetura-serverless-na-aws.md) | Adoção de arquitetura serverless na AWS |
