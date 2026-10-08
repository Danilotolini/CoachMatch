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

## Diagramas de Componentes (C3)

Lambdas de cada domínio, como chegam pela API e com o que se comunicam.

### Coaches

```mermaid
C4Component
    title Componentes — Coaches (C3)

    Container(api, "HTTP API", "API Gateway", "Roteamento e autorização JWT")
    System_Ext(cognito, "Cognito", "Post-Confirmation Trigger")
    ContainerDb(db, "DynamoDB", "Amazon DynamoDB", "Tabela coaches")

    Container_Boundary(coaches, "Coaches") {
        Component(getMe, "coachGetMe", "Lambda", "Retorna perfil do profissional autenticado")
        Component(updateMe, "coachUpdateMe", "Lambda", "Atualiza perfil do profissional")
        Component(create, "coachCreate", "Lambda", "Cria perfil após confirmação de cadastro")
    }

    Rel(api, getMe, "GET /coach/me")
    Rel(api, updateMe, "PUT /coach/me")
    Rel(cognito, create, "Post-Confirmation Trigger")
    Rel(getMe, db, "lê")
    Rel(updateMe, db, "escreve")
    Rel(create, db, "cria")
```

### Alunos

```mermaid
C4Component
    title Componentes — Alunos (C3)

    Container(api, "HTTP API", "API Gateway", "Roteamento e autorização JWT")
    System_Ext(cognito, "Cognito", "Post-Confirmation Trigger")
    ContainerDb(db, "DynamoDB", "Amazon DynamoDB", "Tabela students")

    Container_Boundary(alunos, "Alunos") {
        Component(getProfile, "studentGetProfile", "Lambda", "Retorna perfil do aluno")
        Component(updateProfile, "studentUpdateProfile", "Lambda", "Atualiza dados de perfil")
        Component(updateHealth, "studentUpdateHealth", "Lambda", "Atualiza informações de saúde")
        Component(create, "studentCreate", "Lambda", "Cria perfil após confirmação")
    }

    Rel(api, getProfile, "GET /student/me")
    Rel(api, updateProfile, "PUT /student/me · POST /student/me/profile")
    Rel(api, updateHealth, "POST /student/me/health")
    Rel(cognito, create, "Post-Confirmation Trigger")
    Rel(getProfile, db, "lê")
    Rel(updateProfile, db, "escreve")
    Rel(updateHealth, db, "escreve")
    Rel(create, db, "cria")
```

### Agendamentos

```mermaid
C4Component
    title Componentes — Agendamentos (C3)

    Container(api, "HTTP API", "API Gateway", "")
    ContainerDb(db, "DynamoDB", "Amazon DynamoDB", "Tabela schedule")
    Container(filaPayment, "Fila payment.succeeded", "Amazon SQS", "Evento emitido após pagamento aprovado")
    Container(filaEmail, "Fila MailSender", "Amazon SQS", "Eventos para envio de e-mails")

    Container_Boundary(sched, "Agendamentos") {
        Component(getCoachSched, "getCoachSchedule / getGymSchedule", "Lambda", "Lê agenda do profissional ou academia")
        Component(postCoachSched, "postCoachSchedule", "Lambda", "Define disponibilidade do profissional")
        Component(postRequest, "postScheduleRequest", "Lambda", "Aluno solicita sessão")
        Component(approve, "postApproveSchedule", "Lambda", "Profissional aprova solicitação")
        Component(cancel, "cancelSchedule (aluno/prof)", "Lambda", "Cancela sessão ou solicitação")
        Component(status, "postClassStatus", "Lambda", "Marca sessão como realizada ou falta")
        Component(onPayment, "on-payment-succeeded", "Lambda", "Marca sessão como paga ao receber evento SQS")
    }

    Rel(api, getCoachSched, "GET /coach/schedule · GET /student/...")
    Rel(api, postCoachSched, "POST /coach/schedule")
    Rel(api, postRequest, "POST /student/coach/schedules/request")
    Rel(api, approve, "PATCH /coach/schedule/requests/{id}")
    Rel(api, cancel, "DELETE ... · POST .../cancel")
    Rel(api, status, "POST /coach/schedule/status")
    Rel(filaPayment, onPayment, "consome")
    Rel(getCoachSched, db, "lê")
    Rel(postCoachSched, db, "escreve")
    Rel(postRequest, db, "escreve")
    Rel(postRequest, filaEmail, "notifica")
    Rel(approve, db, "atualiza")
    Rel(approve, filaEmail, "notifica")
    Rel(cancel, db, "atualiza")
    Rel(cancel, filaEmail, "notifica")
    Rel(status, db, "atualiza")
    Rel(onPayment, db, "atualiza sessão como paga")
```

### Pagamentos

```mermaid
C4Component
    title Componentes — Pagamentos (C3)

    Container(api, "HTTP API", "API Gateway", "")
    ContainerDb(db, "DynamoDB", "Amazon DynamoDB", "Tabela payments")
    System_Ext(gw, "Gateway de Pagamento", "A definir — cartões e PIX simulados por enquanto")
    Container(filaPayment, "Fila payment.succeeded", "Amazon SQS", "Emitida após pagamento aprovado")

    Container_Boundary(pag, "Pagamentos") {
        Component(create, "createPayment", "Lambda", "Cria cobrança da sessão")
        Component(get, "getPayment", "Lambda", "Consulta status do pagamento")
        Component(refund, "refundPayment", "Lambda", "Estorna pagamento")
    }

    Rel(api, create, "POST /payments")
    Rel(api, get, "GET /payments/{id}")
    Rel(api, refund, "POST /payments/{id}/refund")
    Rel(create, db, "persiste")
    Rel(create, gw, "processa cobrança")
    Rel(create, filaPayment, "emite payment.succeeded")
    Rel(get, db, "lê")
    Rel(refund, db, "atualiza")
    Rel(refund, gw, "estorna")
```

### Chat

```mermaid
C4Component
    title Componentes — Chat (C3)

    Container(api, "HTTP API", "API Gateway", "")
    System_Ext(stream, "GetStream.io", "Chat as a Service")
    Container(pwa, "PWA React", "React", "Exibe mensagens em tempo real")

    Container_Boundary(chat, "Chat") {
        Component(apiChat, "api-chat", "Lambda", "Gera tokens, gerencia canais e mensagens via GetStream Server SDK")
    }

    Rel(api, apiChat, "POST /chat/token · /chat/conversations · ...")
    Rel(apiChat, stream, "cria tokens e canais")
    Rel(pwa, stream, "mensagens em tempo real, WebSocket")
```

### Upload de Mídia

```mermaid
C4Component
    title Componentes — Upload de Mídia (C3)

    Container(api, "HTTP API", "API Gateway", "")
    Container(pwa, "PWA React", "React", "")

    Container_Boundary(upload, "Upload de Mídia") {
        Component(genUrl, "generateUploadUrl", "Lambda", "Gera URL pré-assinada para upload direto no S3")
        Component(bucket, "Bucket de Mídia", "Amazon S3", "Armazena fotos e vídeos de perfil")
    }

    Rel(api, genUrl, "POST /coach/upload-url · POST /student/upload-url")
    Rel(genUrl, bucket, "assina URL")
    Rel(pwa, bucket, "upload direto com URL pré-assinada, HTTPS PUT")
```

### Academias e Especialidades

```mermaid
C4Component
    title Componentes — Academias e Especialidades (C3)

    Container(api, "HTTP API", "API Gateway", "")
    ContainerDb(db, "DynamoDB", "Amazon DynamoDB", "Tabelas gyms · specialties")

    Container_Boundary(ac, "Academias") {
        Component(getGyms, "getGyms / gymGet", "Lambda", "Lista academias disponíveis")
        Component(suggestGym, "postGymsSuggest / gymSuggest", "Lambda", "Recebe sugestões de novas academias")
    }
    Container_Boundary(esp, "Especialidades") {
        Component(getSpec, "getSpecialties", "Lambda", "Lista especialidades cadastradas")
    }

    Rel(api, getGyms, "GET /coach/gyms · GET /student/gyms")
    Rel(api, suggestGym, "POST /coach/gyms/suggest · POST /student/gyms/suggest")
    Rel(api, getSpec, "GET /coach/specialties · GET /student/specialties")
    Rel(getGyms, db, "lê")
    Rel(suggestGym, db, "escreve")
    Rel(getSpec, db, "lê")
```

> **Validação CREF (não implantado — SCRUM-5):** o Validador CREF-SP e o Agendador CREF estão modelados no DSL com componentes `cref-unload`, `cref-sp-scraper` e `cref-update` (filas SQS + 2Captcha). O diagrama de componentes completo está em [`docs/c4/workspace.dsl`](../c4/workspace.dsl), view `ComponentesValidadorCrefSp`.

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
