workspace "CoachMatch" "Plataforma que conecta alunos a personal trainers qualificados no Brasil." {

    !identifiers hierarchical

    model {
        aluno = person "Aluno" {
            description "Pessoa que busca um personal trainer compatível com seus objetivos, localização e disponibilidade."
        }

        profissional = person "Coach" {
            description "Educador físico com registro CREF ativo que usa a plataforma para divulgar seus serviços, gerenciar sua agenda e construir reputação por meio de avaliações."
        }

        coachMatch = softwareSystem "CoachMatch" {
            description "PWA de plataforma bilateral que conecta alunos a personal trainers, com busca, agendamento, pagamento e avaliações."
            tags "Sistema em Foco"

            pwa = container "Aplicação PWA" {
                description "Single-page application instalável que oferece a interface da plataforma para alunos e profissionais."
                technology "React, TypeScript, Vite, Tailwind CSS"
            }

            apiRest = container "API REST" {
                description "Expõe os endpoints HTTPS/JSON do backend, aplica autorização JWT e roteia requisições às funções."
                technology "Amazon API Gateway"
            }

            coaches = container "Coaches" {
                description "Implementa as regras de negócio relacionadas aos profissionais: cadastro, perfil público, serviços oferecidos e agenda."
                technology "AWS Lambda (Node.js)"

                coachGetMe = component "coachmatch-dev-coachGetMe" {
                    description "Retorna o perfil do profissional autenticado."
                    technology "AWS Lambda (Node.js)"
                }

                coachUpdateMe = component "coachmatch-dev-coachUpdateMe" {
                    description "Atualiza o perfil do profissional autenticado."
                    technology "AWS Lambda (Node.js)"
                }

                coachCreate = component "coachmatch-dev-coachCreate" {
                    description "Cria o perfil do profissional após a confirmação do cadastro."
                    technology "AWS Lambda (Node.js)"
                }
            }

            alunos = container "Alunos" {
                description "Implementa as regras de negócio relacionadas aos alunos: cadastro, perfil e favoritos."
                technology "AWS Lambda (Node.js)"

                studentGetProfile = component "coachmatch-dev-studentGetProfile" {
                    description "Retorna o perfil do aluno autenticado."
                    technology "AWS Lambda (Node.js)"
                }

                studentUpdateProfile = component "coachmatch-dev-studentUpdateProfile" {
                    description "Atualiza os dados de perfil do aluno."
                    technology "AWS Lambda (Node.js)"
                }

                studentUpdateHealth = component "coachmatch-dev-studentUpdateHealth" {
                    description "Atualiza as informações de saúde do aluno."
                    technology "AWS Lambda (Node.js)"
                }

                studentCreate = component "coachmatch-dev-studentCreate" {
                    description "Cria o perfil do aluno após a confirmação do cadastro."
                    technology "AWS Lambda (Node.js)"
                }
            }

            academias = container "Academias" {
                description "Implementa as regras de negócio relacionadas às academias e locais de atendimento."
                technology "AWS Lambda (Node.js)"

                getGyms = component "get-gyms" {
                    description "Retorna a lista de academias disponíveis, para o profissional."
                    technology "AWS Lambda (Node.js)"
                }

                postGymsSuggest = component "post-gyms-suggest" {
                    description "Recebe sugestões de novas academias enviadas pelo profissional."
                    technology "AWS Lambda (Node.js)"
                }

                gymGet = component "coachmatch-dev-gymGet" {
                    description "Retorna a lista de academias disponíveis, para o aluno."
                    technology "AWS Lambda (Node.js)"
                }

                gymSuggest = component "coachmatch-dev-gymSuggest" {
                    description "Recebe sugestões de novas academias enviadas pelo aluno."
                    technology "AWS Lambda (Node.js)"
                }
            }

            especialidades = container "Especialidades" {
                description "Implementa as regras de negócio relacionadas às especialidades dos profissionais."
                technology "AWS Lambda (Node.js)"

                getSpecialties = component "get-specialties" {
                    description "Retorna a lista de especialidades cadastradas."
                    technology "AWS Lambda (Node.js)"
                }
            }

            agendamentos = container "Agendamentos" {
                description "Implementa as regras de negócio de busca, agendamento e avaliação das sessões."
                technology "AWS Lambda (Node.js)"

                getCoachScheduleFromJwt = component "get-coach-schedule-from-jwt" {
                    description "Retorna a agenda do profissional autenticado."
                    technology "AWS Lambda (Node.js)"
                }

                postCoachSchedule = component "post-coach-schedule" {
                    description "Cria ou atualiza os horários de disponibilidade do profissional."
                    technology "AWS Lambda (Node.js)"
                }

                getGymScheduleFromParm = component "get-gym-schedule-from-parm" {
                    description "Retorna a agenda de uma academia a partir de parâmetros da requisição."
                    technology "AWS Lambda (Node.js)"
                }

                getCoachScheduleFromParm = component "get-coach-schedule-from-parm" {
                    description "Retorna a agenda de um profissional a partir de parâmetros da requisição."
                    technology "AWS Lambda (Node.js)"
                }

                getStudentRequestsByJwt = component "get-student-requests-by-JWT" {
                    description "Retorna as solicitações de agendamento do aluno autenticado."
                    technology "AWS Lambda (Node.js)"
                }

                cancelStudentRequest = component "cancel-student-request" {
                    description "Cancela uma solicitação de agendamento feita pelo aluno."
                    technology "AWS Lambda (Node.js)"
                }

                postScheduleRequest = component "post-schedule-request" {
                    description "Cria uma solicitação de agendamento de sessão pelo aluno."
                    technology "AWS Lambda (Node.js)"
                }

                postStudentCancelSchedule = component "post-student-cancel-schedule" {
                    description "Cancela, pelo aluno, uma sessão já confirmada."
                    technology "AWS Lambda (Node.js)"
                }

                getScheduleRequests = component "get-schedule-requests" {
                    description "Retorna as solicitações de agendamento pendentes recebidas pelo profissional."
                    technology "AWS Lambda (Node.js)"
                }

                postApproveSchedule = component "post-approve-schedule" {
                    description "Aprova, pelo profissional, uma solicitação de agendamento."
                    technology "AWS Lambda (Node.js)"
                }

                postCoachCancelSchedule = component "post-coach-cancel-schedule" {
                    description "Cancela, pelo profissional, uma sessão já confirmada."
                    technology "AWS Lambda (Node.js)"
                }

                postClassStatus = component "post-class-status" {
                    description "Atualiza o status de uma sessão (realizada, não comparecimento etc.)."
                    technology "AWS Lambda (Node.js)"
                }

                filaMailSender = component "Fila MailSender" {
                    description "Fila de eventos de agendamento para futuro envio de e-mails/notificações."
                    technology "Amazon SQS"
                    tags "Armazenamento" "Fila"
                }
            }

            pagamento = container "Pagamento" {
                description "Implementa as regras de negócio de cobrança e processamento dos pagamentos das sessões contratadas."
                technology "AWS Lambda (Node.js)"
            }

            chat = container "Chat" {
                description "Gera tokens de acesso, gerencia canais e integra a plataforma ao GetStream Chat."
                technology "AWS Lambda (Node.js)"

                apiChat = component "api-chat" {
                    description "Implementa os endpoints de chat (tokens, conversas e mensagens), integrando com o GetStream."
                    technology "AWS Lambda (Node.js)"
                }
            }

            uploadMidia = container "Sistema de Upload de Mídia" {
                description "Gera URLs pré-assinadas para upload de fotos de perfil, vídeos e demais mídias."
                technology "AWS Lambda (Node.js)"

                generateProfileVideoUploadUrl = component "generate-profile-video-upload-url" {
                    description "Gera a URL pré-assinada para upload de foto/vídeo de perfil."
                    technology "AWS Lambda (Node.js)"
                }

                bucketMidia = component "Bucket de Mídia" {
                    description "Armazena fotos de perfil, vídeos e demais mídias enviadas por alunos e profissionais."
                    technology "Amazon S3"
                    tags "Armazenamento" "Bucket"
                }
            }

            validadorCrefSp = container "Validador CREF-SP" {
                description "Consulta a autenticidade e situação do registro CREF dos profissionais, contornando o captcha via 2Captcha."
                technology "AWS Lambda (Node.js)"

                crefUnload = component "cref-unload" {
                    description "Lê os registros de profissionais pendentes de validação na tabela Coaches e os envia para a fila CREF-SP-INPUT."
                    technology "AWS Lambda (Node.js)"
                }

                crefSpScraper = component "cref-sp-scraper" {
                    description "Consulta o registro do profissional no site do CREF-SP, resolvendo o captcha via 2Captcha, e publica o resultado na fila CREF-SP-OUTPUT."
                    technology "AWS Lambda (Node.js)"
                }

                crefUpdate = component "cref-update" {
                    description "Consome o resultado da fila CREF-SP-OUTPUT e atualiza o status de verificação na tabela Coaches."
                    technology "AWS Lambda (Node.js)"
                }

                filaCrefInput = component "Fila CREF-SP-INPUT" {
                    description "Fila de registros de profissionais pendentes de validação no CREF-SP."
                    technology "Amazon SQS"
                    tags "Armazenamento" "Fila"
                }

                filaCrefOutput = component "Fila CREF-SP-OUTPUT" {
                    description "Fila com o resultado da validação dos registros consultados no CREF-SP."
                    technology "Amazon SQS"
                    tags "Armazenamento" "Fila"
                }
            }

            banco = container "Banco de Dados" {
                description "Persiste perfis, serviços, agendas, sessões, avaliações e favoritos."
                technology "Amazon DynamoDB"
                tags "Armazenamento" "BancoDados"
            }

            autenticacao = container "Provedor de Identidade" {
                description "Gerencia cadastro, login (e-mail/senha e federado), verificação de e-mail, recuperação de senha (incluindo o envio dos respectivos e-mails) e emissão de tokens JWT."
                technology "Amazon Cognito"
            }

            agendadorCref = container "Agendador de Verificação CREF" {
                description "Aciona periodicamente a verificação do registro CREF dos profissionais."
                technology "Amazon EventBridge Scheduler"
            }

        }

        cref = softwareSystem "CREF" {
            description "Conselho Regional de Educação Física. Fonte oficial para verificação de registro profissional."
            tags "Sistema Externo"
        }

        google = softwareSystem "Google Identity" {
            description "Provedor de identidade externo utilizado para autenticação social (login com Google)."
            tags "Sistema Externo"
        }

        gatewayPagamento = softwareSystem "Gateway de Pagamento" {
            description "Processador de pagamentos para sessões contratadas."
            tags "Sistema Externo" "A Definir"
        }

        twoCaptcha = softwareSystem "2Captcha" {
            description "Serviço de resolução automática de captchas, utilizado para contornar o captcha do site do CREF durante a verificação do registro profissional."
            tags "Sistema Externo"
        }

        getStream = softwareSystem "GetStream.io" {
            description "Plataforma de chat como serviço (Chat as a Service), utilizada para o sistema de mensagens entre alunos e profissionais."
            tags "Sistema Externo"
        }

        # Relacionamentos C1: atores -> sistema
        aluno -> coachMatch "Se cadastra, busca profissionais, agenda sessões, paga e avalia" "HTTPS"
        profissional -> coachMatch "Se cadastra, gerencia serviços, agenda, perfil público e visualiza ganhos" "HTTPS"

        # Relacionamentos C1: sistema -> sistemas externos
        coachMatch -> cref "Verifica autenticidade e situação do registro CREF informado pelo profissional" "HTTPS"
        coachMatch -> google "Federa autenticação social (via Cognito)" "OAuth 2.0"
        coachMatch -> gatewayPagamento "Processa pagamentos das sessões contratadas" "HTTPS"
        coachMatch -> twoCaptcha "Resolve o captcha do site do CREF durante a verificação automatizada do registro" "HTTPS / API"
        coachMatch -> getStream "Provê a infraestrutura de chat entre aluno e profissional" "HTTPS / API"

        # Relacionamentos C2: atores -> PWA (ponto de entrada da plataforma)
        aluno -> coachMatch.pwa "Acessa a plataforma" "HTTPS"
        profissional -> coachMatch.pwa "Acessa a plataforma" "HTTPS"

        # Relacionamentos C2: atores -> Provedor de Identidade (login hospedado)
        aluno -> coachMatch.autenticacao "Faz cadastro, login e recuperação de senha" "HTTPS / OIDC"
        profissional -> coachMatch.autenticacao "Faz cadastro, login e recuperação de senha" "HTTPS / OIDC"

        # Relacionamentos C2: PWA -> backend
        coachMatch.pwa -> coachMatch.autenticacao "Troca authorization code por tokens e renova sessão" "HTTPS / OIDC"
        coachMatch.pwa -> coachMatch.apiRest "Consome endpoints de negócio" "HTTPS / JSON"

        # Relacionamentos C2: API e funções
        coachMatch.apiRest -> coachMatch.autenticacao "Valida tokens JWT das requisições autenticadas" "HTTPS / JWT"
        coachMatch.apiRest -> coachMatch.coaches "Roteia requisições relacionadas a profissionais" "Invoke"
        coachMatch.apiRest -> coachMatch.alunos "Roteia requisições relacionadas a alunos" "Invoke"
        coachMatch.apiRest -> coachMatch.academias "Roteia requisições relacionadas a academias" "Invoke"
        coachMatch.apiRest -> coachMatch.especialidades "Roteia requisições relacionadas a especialidades" "Invoke"
        coachMatch.apiRest -> coachMatch.agendamentos "Roteia requisições relacionadas a agendamentos" "Invoke"
        coachMatch.apiRest -> coachMatch.pagamento "Roteia requisições relacionadas a pagamentos" "Invoke"
        coachMatch.agendamentos -> coachMatch.pagamento "Aciona a cobrança da sessão agendada" "Invoke"
        coachMatch.apiRest -> coachMatch.chat "Roteia requisições relacionadas ao chat" "Invoke"
        coachMatch.apiRest -> coachMatch.uploadMidia "Roteia requisições de upload de mídia" "Invoke"
        coachMatch.agendadorCref -> coachMatch.validadorCrefSp "Aciona periodicamente a verificação do registro CREF" "Invoke"

        # Relacionamentos C2: funções -> banco de dados
        coachMatch.coaches -> coachMatch.banco "Lê e escreve dados de perfis, serviços e agenda dos profissionais" "AWS SDK"
        coachMatch.alunos -> coachMatch.banco "Lê e escreve dados de perfis e favoritos dos alunos" "AWS SDK"
        coachMatch.academias -> coachMatch.banco "Lê e escreve dados de academias" "AWS SDK"
        coachMatch.especialidades -> coachMatch.banco "Lê e escreve dados de especialidades" "AWS SDK"
        coachMatch.agendamentos -> coachMatch.banco "Lê e escreve dados de sessões agendadas e avaliações" "AWS SDK"
        coachMatch.pagamento -> coachMatch.banco "Lê e escreve dados de cobranças e transações" "AWS SDK"
        coachMatch.chat -> coachMatch.banco "Lê e escreve metadados das conversas" "AWS SDK"
        coachMatch.validadorCrefSp -> coachMatch.banco "Atualiza o status de verificação do registro CREF" "AWS SDK"

        # Relacionamentos C2: PWA -> Sistema de Upload de Mídia
        coachMatch.pwa -> coachMatch.uploadMidia "Faz upload direto da mídia usando a URL pré-assinada recebida da API" "HTTPS / PUT"

        # Relacionamentos C2: contêineres -> sistemas externos
        coachMatch.autenticacao -> google "Federa autenticação social via OAuth/OIDC" "OAuth 2.0"
        coachMatch.validadorCrefSp -> cref "Consulta autenticidade e situação do registro CREF" "HTTPS"
        coachMatch.validadorCrefSp -> twoCaptcha "Resolve o captcha durante a consulta automatizada ao site do CREF" "HTTPS / API"
        coachMatch.pagamento -> gatewayPagamento "Cria cobranças das sessões contratadas" "HTTPS"
        coachMatch.chat -> getStream "Gera tokens de acesso e gerencia canais via Server SDK" "HTTPS / API"
        coachMatch.pwa -> getStream "Troca mensagens em tempo real via Client SDK" "HTTPS / WebSocket"

        # Relacionamentos C3: API REST -> componentes (Agendamentos)
        coachMatch.apiRest -> coachMatch.agendamentos.getCoachScheduleFromJwt "GET /coach/schedule" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.postCoachSchedule "POST /coach/schedule" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.getGymScheduleFromParm "GET /student/gyms/schedule" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.getCoachScheduleFromParm "GET /student/coach/schedules" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.getStudentRequestsByJwt "GET /student/coach/schedules/request" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.cancelStudentRequest "DELETE /student/coach/schedules/request" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.postScheduleRequest "POST /student/coach/schedules/request" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.postStudentCancelSchedule "POST /student/coach/schedules/cancel" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.getScheduleRequests "GET /coach/schedule/requests (endpoint inferido, não informado na especificação)" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.postApproveSchedule "PATCH /coach/schedule/requests/{id} (endpoint inferido, não informado na especificação)" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.agendamentos.postCoachCancelSchedule "POST /coach/schedule/cancel (endpoint inferido, não informado na especificação)" "HTTPS / JSON"

        # Relacionamentos C3: API REST -> componentes (Academias)
        coachMatch.apiRest -> coachMatch.academias.getGyms "GET /coach/gyms" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.academias.postGymsSuggest "POST /coach/gyms/suggest" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.academias.gymGet "GET /student/gyms" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.academias.gymSuggest "POST /student/gyms/suggest" "HTTPS / JSON"

        # Relacionamentos C3: API REST -> componentes (Especialidades)
        coachMatch.apiRest -> coachMatch.especialidades.getSpecialties "GET /coach/specialties" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.especialidades.getSpecialties "GET /student/specialties" "HTTPS / JSON"

        # Relacionamentos C3: API REST -> componentes (Upload de Mídia)
        coachMatch.apiRest -> coachMatch.uploadMidia.generateProfileVideoUploadUrl "POST /coach/upload-url" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.uploadMidia.generateProfileVideoUploadUrl "POST /student/upload-url" "HTTPS / JSON"

        # Relacionamentos C3: API REST -> componentes (Coaches)
        coachMatch.apiRest -> coachMatch.coaches.coachGetMe "GET /coach/me" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.coaches.coachUpdateMe "PUT /coach/me" "HTTPS / JSON"
        coachMatch.autenticacao -> coachMatch.coaches.coachCreate "Aciona a criação do perfil do profissional após a confirmação do cadastro" "Cognito Trigger"

        # Relacionamentos C3: API REST -> componentes (Alunos)
        coachMatch.apiRest -> coachMatch.alunos.studentGetProfile "GET /student/me" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.alunos.studentUpdateProfile "PUT /student/me" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.alunos.studentUpdateProfile "POST /student/me/profile" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.alunos.studentUpdateHealth "POST /student/me/health" "HTTPS / JSON"
        coachMatch.autenticacao -> coachMatch.alunos.studentCreate "Aciona a criação do perfil do aluno após a confirmação do cadastro" "Cognito Trigger"

        # Relacionamentos C3: API REST -> componentes (Chat)
        coachMatch.apiRest -> coachMatch.chat.apiChat "POST /chat/token" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.chat.apiChat "POST /chat/conversations" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.chat.apiChat "GET /chat/conversations" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.chat.apiChat "PATCH /chat/conversations/{id}" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.chat.apiChat "DELETE /chat/conversations/{id}" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.chat.apiChat "POST /chat/conversations/{id}/messages" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.chat.apiChat "GET /chat/conversations/{id}/messages" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.chat.apiChat "PATCH /chat/messages/{id}" "HTTPS / JSON"
        coachMatch.apiRest -> coachMatch.chat.apiChat "DELETE /chat/messages/{id}" "HTTPS / JSON"

        # Relacionamentos C3: componentes -> banco de dados (Agendamentos)
        coachMatch.agendamentos.getCoachScheduleFromJwt -> coachMatch.banco "Lê a agenda do profissional autenticado" "AWS SDK"
        coachMatch.agendamentos.postCoachSchedule -> coachMatch.banco "Grava os horários de disponibilidade do profissional" "AWS SDK"
        coachMatch.agendamentos.getGymScheduleFromParm -> coachMatch.banco "Lê a agenda de uma academia" "AWS SDK"
        coachMatch.agendamentos.getCoachScheduleFromParm -> coachMatch.banco "Lê a agenda de um profissional" "AWS SDK"
        coachMatch.agendamentos.getStudentRequestsByJwt -> coachMatch.banco "Lê as solicitações de agendamento do aluno autenticado" "AWS SDK"
        coachMatch.agendamentos.cancelStudentRequest -> coachMatch.banco "Atualiza/remove a solicitação de agendamento do aluno" "AWS SDK"
        coachMatch.agendamentos.postScheduleRequest -> coachMatch.banco "Grava a solicitação de agendamento" "AWS SDK"
        coachMatch.agendamentos.postStudentCancelSchedule -> coachMatch.banco "Atualiza o status da sessão cancelada pelo aluno" "AWS SDK"
        coachMatch.agendamentos.getScheduleRequests -> coachMatch.banco "Lê as solicitações de agendamento pendentes do profissional" "AWS SDK"
        coachMatch.agendamentos.postApproveSchedule -> coachMatch.banco "Atualiza o status da solicitação para aprovada" "AWS SDK"
        coachMatch.agendamentos.postCoachCancelSchedule -> coachMatch.banco "Atualiza o status da sessão cancelada pelo profissional" "AWS SDK"
        coachMatch.agendamentos.postClassStatus -> coachMatch.banco "Atualiza o status da sessão (realizada/não comparecimento)" "AWS SDK"

        # Relacionamentos C3: componentes -> fila MailSender (Agendamentos)
        coachMatch.agendamentos.postScheduleRequest -> coachMatch.agendamentos.filaMailSender "Envia evento de nova solicitação de agendamento" "AWS SDK / SQS"
        coachMatch.agendamentos.postStudentCancelSchedule -> coachMatch.agendamentos.filaMailSender "Envia evento de cancelamento de sessão pelo aluno" "AWS SDK / SQS"
        coachMatch.agendamentos.cancelStudentRequest -> coachMatch.agendamentos.filaMailSender "Envia evento de cancelamento de solicitação pelo aluno" "AWS SDK / SQS"
        coachMatch.agendamentos.postApproveSchedule -> coachMatch.agendamentos.filaMailSender "Envia evento de aprovação de solicitação" "AWS SDK / SQS"
        coachMatch.agendamentos.postCoachCancelSchedule -> coachMatch.agendamentos.filaMailSender "Envia evento de cancelamento de sessão pelo profissional" "AWS SDK / SQS"

        # Relacionamentos C3: componentes -> banco de dados (Academias, Especialidades)
        coachMatch.academias.getGyms -> coachMatch.banco "Lê a lista de academias" "AWS SDK"
        coachMatch.academias.postGymsSuggest -> coachMatch.banco "Grava a sugestão de academia enviada pelo profissional" "AWS SDK"
        coachMatch.academias.gymGet -> coachMatch.banco "Lê a lista de academias" "AWS SDK"
        coachMatch.academias.gymSuggest -> coachMatch.banco "Grava a sugestão de academia enviada pelo aluno" "AWS SDK"
        coachMatch.especialidades.getSpecialties -> coachMatch.banco "Lê a lista de especialidades" "AWS SDK"

        # Relacionamentos C3: componente -> bucket de mídia (Upload de Mídia)
        coachMatch.uploadMidia.generateProfileVideoUploadUrl -> coachMatch.uploadMidia.bucketMidia "Assina a URL pré-assinada de upload" "AWS SDK"
        coachMatch.pwa -> coachMatch.uploadMidia.bucketMidia "Faz upload direto da mídia usando a URL pré-assinada recebida da API" "HTTPS / PUT"

        # Relacionamentos C3: componentes -> banco de dados (Coaches, Alunos)
        coachMatch.coaches.coachGetMe -> coachMatch.banco "Lê o perfil do profissional" "AWS SDK"
        coachMatch.coaches.coachUpdateMe -> coachMatch.banco "Atualiza o perfil do profissional" "AWS SDK"
        coachMatch.coaches.coachCreate -> coachMatch.banco "Cria o registro inicial do profissional" "AWS SDK"
        coachMatch.alunos.studentGetProfile -> coachMatch.banco "Lê o perfil do aluno" "AWS SDK"
        coachMatch.alunos.studentUpdateProfile -> coachMatch.banco "Atualiza o perfil do aluno" "AWS SDK"
        coachMatch.alunos.studentUpdateHealth -> coachMatch.banco "Atualiza as informações de saúde do aluno" "AWS SDK"
        coachMatch.alunos.studentCreate -> coachMatch.banco "Cria o registro inicial do aluno" "AWS SDK"

        # Relacionamentos C3: componente -> banco de dados e GetStream (Chat)
        coachMatch.chat.apiChat -> coachMatch.banco "Lê e escreve metadados das conversas" "AWS SDK"
        coachMatch.chat.apiChat -> getStream "Gera tokens de acesso e gerencia canais/mensagens via Server SDK" "HTTPS / API"

        # Relacionamentos C3: fluxo de validação CREF-SP
        coachMatch.agendadorCref -> coachMatch.validadorCrefSp.crefUnload "Aciona periodicamente a verificação do registro CREF" "Invoke"
        coachMatch.validadorCrefSp.crefUnload -> coachMatch.banco "Lê os registros de profissionais pendentes de validação (tabela Coaches)" "AWS SDK"
        coachMatch.validadorCrefSp.crefUnload -> coachMatch.validadorCrefSp.filaCrefInput "Envia os registros pendentes para validação" "AWS SDK / SQS"
        coachMatch.validadorCrefSp.filaCrefInput -> coachMatch.validadorCrefSp.crefSpScraper "Aciona o processamento de cada registro" "AWS SDK / SQS Trigger"
        coachMatch.validadorCrefSp.crefSpScraper -> cref "Consulta o registro do profissional no site do CREF-SP" "HTTPS"
        coachMatch.validadorCrefSp.crefSpScraper -> twoCaptcha "Resolve o captcha do site do CREF-SP" "HTTPS / API"
        coachMatch.validadorCrefSp.crefSpScraper -> coachMatch.validadorCrefSp.filaCrefOutput "Publica o resultado da validação" "AWS SDK / SQS"
        coachMatch.validadorCrefSp.filaCrefOutput -> coachMatch.validadorCrefSp.crefUpdate "Aciona a atualização do status de validação" "AWS SDK / SQS Trigger"
        coachMatch.validadorCrefSp.crefUpdate -> coachMatch.banco "Atualiza o status de verificação do registro CREF (tabela Coaches)" "AWS SDK"

    }

    views {
        systemContext coachMatch "ContextoSistema" {
            include *
            autoLayout tb
            description "Diagrama de Contexto (C1) — CoachMatch e seu entorno: usuários e sistemas externos."
        }

        container coachMatch "Conteineres" {
            include *
            autoLayout tb
            description "Diagrama de Contêineres (C2) — PWA React, backend serverless (API Gateway/Lambda/DynamoDB/S3) e autenticação (Cognito)."
        }

        component coachMatch.agendamentos "ComponentesAgendamentos" {
            include *
            autoLayout tb
            description "Diagrama de Componentes (C3) — Lambdas do domínio Agendamentos."
        }

        component coachMatch.academias "ComponentesAcademias" {
            include *
            autoLayout tb
            description "Diagrama de Componentes (C3) — Lambdas do domínio Academias."
        }

        component coachMatch.especialidades "ComponentesEspecialidades" {
            include *
            autoLayout tb
            description "Diagrama de Componentes (C3) — Lambda do domínio Especialidades."
        }

        component coachMatch.uploadMidia "ComponentesUploadMidia" {
            include *
            autoLayout tb
            description "Diagrama de Componentes (C3) — Lambda do Sistema de Upload de Mídia."
        }

        component coachMatch.coaches "ComponentesCoaches" {
            include *
            autoLayout tb
            description "Diagrama de Componentes (C3) — Lambdas do domínio Coaches."
        }

        component coachMatch.alunos "ComponentesAlunos" {
            include *
            autoLayout tb
            description "Diagrama de Componentes (C3) — Lambdas do domínio Alunos."
        }

        component coachMatch.chat "ComponentesChat" {
            include *
            autoLayout tb
            description "Diagrama de Componentes (C3) — Lambda do domínio Chat (integração com GetStream)."
        }

        component coachMatch.validadorCrefSp "ComponentesValidadorCrefSp" {
            include *
            autoLayout tb
            description "Diagrama de Componentes (C3) — Lambdas do fluxo de validação CREF-SP (cref-unload, cref-sp-scraper, cref-update)."
        }

        component coachMatch.agendamentos "ComponentesTodos" {
            title "CoachMatch"
            include coachMatch.agendamentos.getCoachScheduleFromJwt
            include coachMatch.agendamentos.postCoachSchedule
            include coachMatch.agendamentos.getGymScheduleFromParm
            include coachMatch.agendamentos.getCoachScheduleFromParm
            include coachMatch.agendamentos.getStudentRequestsByJwt
            include coachMatch.agendamentos.cancelStudentRequest
            include coachMatch.agendamentos.postScheduleRequest
            include coachMatch.agendamentos.postStudentCancelSchedule
            include coachMatch.agendamentos.getScheduleRequests
            include coachMatch.agendamentos.postApproveSchedule
            include coachMatch.agendamentos.postCoachCancelSchedule
            include coachMatch.agendamentos.postClassStatus
            include coachMatch.agendamentos.filaMailSender
            include coachMatch.coaches.coachGetMe
            include coachMatch.coaches.coachUpdateMe
            include coachMatch.coaches.coachCreate
            include coachMatch.alunos.studentGetProfile
            include coachMatch.alunos.studentUpdateProfile
            include coachMatch.alunos.studentUpdateHealth
            include coachMatch.alunos.studentCreate
            include coachMatch.academias.getGyms
            include coachMatch.academias.postGymsSuggest
            include coachMatch.academias.gymGet
            include coachMatch.academias.gymSuggest
            include coachMatch.especialidades.getSpecialties
            include coachMatch.chat.apiChat
            include coachMatch.uploadMidia.generateProfileVideoUploadUrl
            include coachMatch.uploadMidia.bucketMidia
            include coachMatch.validadorCrefSp.crefUnload
            include coachMatch.validadorCrefSp.crefSpScraper
            include coachMatch.validadorCrefSp.crefUpdate
            include coachMatch.validadorCrefSp.filaCrefInput
            include coachMatch.validadorCrefSp.filaCrefOutput
            include coachMatch.apiRest
            include coachMatch.pwa
            include coachMatch.banco
            include coachMatch.autenticacao
            include coachMatch.agendadorCref
            include aluno
            include profissional
            include cref
            include google
            include gatewayPagamento
            include twoCaptcha
            include getStream
            autoLayout tb
            description "Diagrama de Componentes (C3) — visão completa de todos os componentes de todos os contêineres, em um único diagrama."
        }

        styles {
            # Fundo geral do diagrama (modo escuro)
            element "Element" {
                background #000000
                color #FFFFFF
                stroke #757575
            }

            # Pessoas — cor de destaque
            element "Person" {
                shape person
                background #F5F5C0
                color #000000
                stroke #F5F5C0
            }

            # Sistema em foco — cor de destaque
            element "Sistema em Foco" {
                background #F5F5C0
                color #000000
                stroke #F5F5C0
            }

            # Sistemas externos (base)
            element "Software System" {
                background #1A1A1A
                color #FFFFFF
                stroke #9E9E9E
            }
            element "Sistema Externo" {
                background #1A1A1A
                color #FFFFFF
                stroke #9E9E9E
            }
            element "A Definir" {
                background #424242
                color #FFFFFF
                stroke #9E9E9E
            }

            # Containers — base (fallback)
            element "Container" {
                background #1A1A1A
                color #FFFFFF
                stroke #BDBDBD
            }

            # Componentes
            element "Component" {
                background #2B2B2B
                color #FFFFFF
                stroke #F5F5C0
            }

            # Armazenamento — tons de cinza
            element "Armazenamento" {
                background #2B2B2B
                color #FFFFFF
                stroke #BDBDBD
            }

            # Shape overrides (aplicados por último, sobrepõem a forma do grupo)
            element "BancoDados" {
                shape cylinder
            }
            element "Bucket" {
                shape folder
            }
            element "Fila" {
                shape pipe
            }

            # Relacionamentos — visíveis sobre fundo preto
            relationship "Relationship" {
                color #CCCCCC
            }
        }
    }

    configuration {
        scope softwaresystem
    }
}