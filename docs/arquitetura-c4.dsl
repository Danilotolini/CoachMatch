workspace "CoachMatch" "Plataforma que conecta alunos a personal trainers qualificados no Brasil." {

    !identifiers hierarchical

    model {
        aluno = person "Aluno" {
            description "Pessoa que busca um personal trainer compatível com seus objetivos, localização e disponibilidade."
        }

        profissional = person "Profissional" {
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

            funcoesAplicacao = container "Funções da Aplicação" {
                description "Implementam as regras de negócio da plataforma (cadastro, busca, agendamento, pagamento, avaliações, perfis)."
                technology "AWS Lambda (Node.js)"
            }

            banco = container "Banco de Dados" {
                description "Persiste perfis, serviços, agendas, sessões, avaliações e favoritos."
                technology "Amazon DynamoDB"
                tags "Armazenamento" "BancoDados"
            }

            bucketMidia = container "Bucket de Mídia" {
                description "Armazena fotos de perfil, vídeos e demais mídias enviadas por alunos e profissionais."
                technology "Amazon S3"
                tags "Armazenamento" "Bucket"
            }

            autenticacao = container "Provedor de Identidade" {
                description "Gerencia cadastro, login (e-mail/senha e federado), verificação de e-mail, recuperação de senha (incluindo o envio dos respectivos e-mails) e emissão de tokens JWT."
                technology "Amazon Cognito"
            }

            chat = container "Chat Interno" {
                description "Canal de conversa entre aluno e profissional."
                tags "A Definir"
            }

        }

        cref = softwareSystem "CREF" {
            description "Conselho Regional de Educação Física. Fonte oficial para verificação de registro profissional."
            tags "Sistema Externo" "A Definir"
        }

        google = softwareSystem "Google Identity" {
            description "Provedor de identidade externo utilizado para autenticação social (login com Google)."
            tags "Sistema Externo"
        }

        gatewayPagamento = softwareSystem "Gateway de Pagamento" {
            description "Processador de pagamentos para sessões contratadas."
            tags "Sistema Externo" "A Definir"
        }

        # Relacionamentos C1: atores -> sistema
        aluno -> coachMatch "Se cadastra, busca profissionais, agenda sessões, paga e avalia" "HTTPS"
        profissional -> coachMatch "Se cadastra, gerencia serviços, agenda, perfil público e visualiza ganhos" "HTTPS"

        # Relacionamentos C1: sistema -> sistemas externos
        coachMatch -> cref "Verifica autenticidade e situação do registro CREF informado pelo profissional" "HTTPS"
        coachMatch -> google "Federa autenticação social (via Cognito)" "OAuth 2.0"
        coachMatch -> gatewayPagamento "Processa pagamentos das sessões contratadas" "HTTPS"

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
        coachMatch.apiRest -> coachMatch.funcoesAplicacao "Roteia requisições para as funções correspondentes" "Invoke"
        coachMatch.funcoesAplicacao -> coachMatch.banco "Lê e escreve dados do domínio" "AWS SDK"
        coachMatch.funcoesAplicacao -> coachMatch.bucketMidia "Assina URLs pré-assinadas de upload (devolvidas à PWA pela API REST)" "AWS SDK"
        coachMatch.pwa -> coachMatch.bucketMidia "Faz upload direto da mídia usando a URL pré-assinada recebida da API" "HTTPS / PUT"
        coachMatch.pwa -> coachMatch.chat "Inicia conversa entre aluno e profissional"

        # Relacionamentos C2: contêineres -> sistemas externos
        coachMatch.autenticacao -> google "Federa autenticação social via OAuth/OIDC" "OAuth 2.0"
        coachMatch.funcoesAplicacao -> cref "Consulta autenticidade e situação do registro CREF" "HTTPS"
        coachMatch.funcoesAplicacao -> gatewayPagamento "Cria cobranças das sessões contratadas" "HTTPS"

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

        styles {
            # Pessoas
            element "Person" {
                shape person
                background #08427b
                color #FFFFFF
            }

            # Sistema em foco
            element "Sistema em Foco" {
                background #1168bd
                color #FFFFFF
            }

            # Sistemas externos (base)
            element "Software System" {
                background #37474F
                color #FFFFFF
            }
            element "Sistema Externo" {
                background #37474F
                color #FFFFFF
            }
            element "A Definir" {
                background #78909C
                color #FFFFFF
            }

            # Containers — base (fallback)
            element "Container" {
                background #438dd5
                color #FFFFFF
            }

            # Shape overrides (aplicados por último, sobrepõem a forma do grupo)
            element "BancoDados" {
                shape cylinder
            }
            element "Bucket" {
                shape folder
            }
        }
    }

    configuration {
        scope softwaresystem
    }
}
