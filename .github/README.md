# 🏋️ CoachMatch 

> **Seu personal, sem adivinhação.**  
> Conectando pessoas aos melhores profissionais de educação física com transparência, confiança e performance.

🌐 **Acesse o web app:** https://coachmatch.com.br

---
## 📖 Sobre o Projeto

O **CoachMatch** é uma plataforma de marketplace que conecta alunos a personal trainers qualificados, facilitando a busca, comparação, contratação e acompanhamento de treinos — tudo em um único lugar.

A proposta nasce para resolver um problema real: hoje, escolher um personal trainer ainda é um processo pouco transparente, baseado em tentativa e erro, com alta taxa de abandono.

---
## 🚀 Proposta de Valor

- 🔍 **Busca inteligente** por localização, modalidade e objetivo  
- 📊 **Transparência total** (avaliações, preços, histórico)  
- 📅 **Agendamento simplificado**  
- 💳 **Pagamentos integrados e seguros**  
- ⭐ **Sistema de avaliação confiável**  
- 📱 Experiência **mobile-first (PWA)**  

---
## 🧠 Problema Resolvido

- Dificuldade de encontrar profissionais confiáveis  
- Falta de padronização e transparência  
- Informações descentralizadas (Instagram, WhatsApp, etc.)  
- Alta taxa de evasão em treinos (~50%)

---
## 💡 Solução

O CoachMatch conecta clientes e profissionais com:
- Filtros inteligentes e recomendações
- Perfis completos com credenciais verificadas
- Sistema de contratação e pagamento integrado
- Experiência online e presencial em um único ambiente

---

## 👥 Perfis de Usuário

### 🧑‍💻 Cliente

- Busca profissionais
- Agenda sessões
- Avalia coaches
- Acompanha histórico

### 🏆 Profissional (Personal Trainer)

- Cria e gerencia serviços
- Define agenda e disponibilidade
- Gerencia clientes e ganhos
- Constrói portfólio digital

---

## 🔄 Principais Fluxos

- Cadastro e autenticação (cliente e profissional)
- Busca e recomendação de profissionais
- Agendamento de sessões
- Pagamento
- Avaliação pós-treino
- Comunicação via plataforma

---

## 🧩 Funcionalidades

- 🔎 Busca por localização, preço e modalidade  
- 📍 Resultados próximos ao usuário  
- 📅 Agenda com disponibilidade em tempo real  
- 💬 Chat / integração com WhatsApp  
- ⭐ Avaliações e reputação  
- 📊 Histórico de sessões  
- 🧾 Perfis com certificações (CREF validado)  

---

## 🏗️ Arquitetura (Visão Geral)

- Frontend: **PWA (Progressive Web App)**
- Backend: API de marketplace
- Banco de dados: estruturado para usuários, sessões e serviços
- Integrações:
  - Pagamentos
  - WhatsApp
  - Sistema de validação de credenciais (CREF)

---

## 📱 Experiência do Usuário

A interface foi projetada para ser:

- Simples e intuitiva  
- Mobile-first  
- Focada em performance e conversão  

---

## 📊 Modelo de Negócio

- 💸 Comissão sobre transações  
- 📈 Planos premium para profissionais  
- 🤝 Parcerias com academias e marcas fitness  
- 📣 Monetização via visibilidade e destaque  

---

## 🎯 Mercado

- Brasil é o **2º maior mercado fitness do mundo**  
- Crescimento acelerado de serviços online  
- Forte tendência de “uberização” de serviços  
- Alta demanda por personalização e performance  

---

## Modelo C4

A arquitetura do CoachMatch está documentada no formato [C4 model](https://c4model.com/) usando a linguagem [Structurizr DSL](https://docs.structurizr.com/dsl). O arquivo fonte fica em [`docs/c4/workspace.dsl`](docs/c4/workspace.dsl).

### Visualizar localmente com Docker

Com [Docker](https://docs.docker.com/get-docker/) instalado, rode o [Structurizr local](https://docs.structurizr.com/local) montando a pasta `docs/c4` (que contém o `workspace.dsl`):

```bash
docker run --rm -it -p 8080:8080 \
  -v "$(pwd)/docs/c4:/usr/local/structurizr" \
  structurizr/structurizr local
```

Depois acesse **http://localhost:8080** no navegador. O Structurizr recarrega automaticamente ao salvar alterações no `workspace.dsl`.

### Visualizar no editor online

Também é possível visualizar/editar sem instalar nada, colando o conteúdo de [`docs/c4/workspace.dsl`](docs/c4/workspace.dsl) no [playground oficial do Structurizr](https://playground.structurizr.com/).
