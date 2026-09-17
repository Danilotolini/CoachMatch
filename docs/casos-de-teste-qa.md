# Casos de Teste — CoachMatch QA

> Testador: __________ | Data: __________

---

## 1. Autenticação

### CT-001 — Login com Google
**Pré-condição:** usuário com conta Google válida  
**Passos:**
1. Acessar a página inicial
2. Clicar em "Entrar com Google"
3. Completar o fluxo OAuth

**Resultado esperado:** redirecionado para o onboarding ou home conforme status da conta

---

### CT-002 — Login com email/senha
**Passos:**
1. Acessar a página inicial
2. Inserir email e senha válidos
3. Confirmar

**Resultado esperado:** redirecionado corretamente

---

### CT-003 — Credenciais inválidas
**Passos:**
1. Inserir email inexistente ou senha errada

**Resultado esperado:** mensagem de erro exibida, sem redirecionamento

---

## 2. Onboarding do Aluno

### CT-010 — Cadastro completo do perfil (PENDING_PROFILE → ONBOARDING_HEALTH)
**Pré-condição:** conta nova, status `PENDING_PROFILE`  
**Passos:**
1. Preencher nome, celular, data de nascimento, gênero
2. Inserir CEP válido e confirmar que cidade/estado preencheram automaticamente
3. Selecionar raio (5, 10 ou 20 km)
4. Selecionar objetivo (Emagrecimento, Hipertrofia, Condicionamento, Reabilitação ou Performance)
5. Salvar

**Resultado esperado:** avança para o formulário de saúde

---

### CT-011 — CEP inválido
**Passos:**
1. Inserir CEP inexistente no campo

**Resultado esperado:** mensagem de erro; cidade/estado não preenchidos

---

### CT-012 — Campos obrigatórios vazios
**Passos:**
1. Tentar salvar perfil com nome em branco

**Resultado esperado:** validação impede envio; mensagem indicando campo obrigatório

---

### CT-013 — Formulário de saúde (ONBOARDING_HEALTH → ACTIVE)
**Pré-condição:** status `ONBOARDING_HEALTH`  
**Passos:**
1. Responder todas as perguntas do PAR-Q (coração, dor no peito, tontura, ossos/articulações, medicamentos)
2. Adicionar observações opcionais
3. Aceitar LGPD e disclaimer médico
4. Enviar

**Resultado esperado:** status muda para `ACTIVE`; redirecionado para a home do aluno

---

### CT-014 — Formulário de saúde sem aceitar os termos
**Passos:**
1. Responder PAR-Q mas não marcar LGPD ou disclaimer
2. Tentar enviar

**Resultado esperado:** envio bloqueado

---

## 3. Perfil do Aluno

### CT-020 — Editar perfil
**Passos:**
1. Acessar "Meu Perfil"
2. Alterar nome e objetivo
3. Salvar

**Resultado esperado:** toast "Perfil atualizado." exibido; dados refletem a mudança

---

### CT-021 — Upload de foto
**Passos:**
1. Clicar na área de foto
2. Selecionar imagem JPEG/PNG
3. Recortar no modal
4. Clicar "Usar foto"
5. Salvar perfil

**Resultado esperado:** foto aparece no perfil após salvar

---

### CT-022 — Celular com formato inválido
**Passos:**
1. Digitar "123" no campo celular
2. Tentar salvar

**Resultado esperado:** mensagem "Telefone incompleto." e envio bloqueado

---

## 4. Busca de Treinadores (Aluno)

### CT-030 — Busca básica
**Passos:**
1. Acessar "Buscar Personal"
2. Observar lista de treinadores disponíveis

**Resultado esperado:** lista carrega com nome, especialidade e local de atendimento

---

### CT-031 — Filtrar por especialidade
**Passos:**
1. Selecionar uma especialidade no filtro
2. Confirmar resultados

**Resultado esperado:** apenas treinadores com aquela especialidade aparecem

---

### CT-032 — Ver detalhe do treinador
**Passos:**
1. Clicar em um treinador na lista
2. Verificar perfil completo

**Resultado esperado:** nome, foto, bio, especialidades, locais de atendimento, horários e preço exibidos

---

## 5. Agendamento (Aluno)

### CT-040 — Solicitar sessão
**Passos:**
1. Abrir perfil de um treinador
2. Selecionar horário disponível no calendário
3. Confirmar pedido

**Resultado esperado:** pedido aparece em "Pedidos" com status "Aguardando treinador"

---

### CT-041 — Verificar sessão confirmada
**Pré-condição:** treinador aprovou o pedido  
**Passos:**
1. Acessar "Suas Sessões" → aba "Próximas"

**Resultado esperado:** sessão aparece com status "Pagamento pendente"

---

### CT-042 — Histórico de sessões
**Passos:**
1. Acessar "Suas Sessões" → aba "Histórico"

**Resultado esperado:** sessões passadas listadas com data, treinador e status

---

## 6. Pagamento (Aluno)

### CT-050 — Pagar sessão com cartão de crédito
**Pré-condição:** sessão confirmada com status "Pagamento pendente"  
**Passos:**
1. Clicar em "Pagar" na sessão
2. Inserir dados do cartão (número, titular, validade, CVV)
3. Confirmar pagamento

**Resultado esperado:** status muda para "Confirmado (Pago)"

---

### CT-051 — Cartão recusado
**Passos:**
1. Inserir cartão inválido ou sem saldo
2. Confirmar pagamento

**Resultado esperado:** mensagem de erro; sessão permanece "Pagamento pendente"

---

### CT-052 — Pagar com Pix
**Passos:**
1. Selecionar Pix como método
2. Seguir fluxo de pagamento

**Resultado esperado:** QR code ou chave Pix exibidos

---

### CT-053 — Reembolso
**Passos:**
1. Acessar detalhe de uma sessão paga
2. Solicitar reembolso com motivo

**Resultado esperado:** confirmação de reembolso iniciado

---

## 7. Onboarding do Treinador

### CT-060 — Cadastro do perfil (PENDING_PROFILE → PENDING_REVIEW)
**Pré-condição:** conta nova de treinador  
**Passos:**
1. Preencher nome, bio, especialidades
2. Adicionar local de atendimento (academia ou atendimento a domicílio)
3. Definir preço por sessão
4. Enviar para revisão

**Resultado esperado:** status muda para `PENDING_REVIEW`; mensagem de aguardo de aprovação

---

### CT-061 — Envio sem especialidade
**Passos:**
1. Tentar enviar perfil sem selecionar nenhuma especialidade

**Resultado esperado:** validação impede envio

---

### CT-062 — Reenvio após rejeição (REJECTED → PENDING_REVIEW)
**Pré-condição:** treinador com status `REJECTED`  
**Passos:**
1. Corrigir os dados do perfil
2. Reenviar para revisão

**Resultado esperado:** status volta para `PENDING_REVIEW`

---

## 8. Agenda do Treinador

### CT-070 — Criar horário disponível
**Passos:**
1. Acessar "Agenda"
2. Selecionar data e hora
3. Confirmar criação

**Resultado esperado:** horário aparece no calendário como disponível

---

### CT-071 — Aprovar pedido de sessão
**Pré-condição:** aluno fez um pedido  
**Passos:**
1. Acessar pedido pendente
2. Clicar em aprovar

**Resultado esperado:** sessão muda para "Booked"; aluno recebe confirmação

---

### CT-072 — Recusar pedido
**Passos:**
1. Acessar pedido pendente
2. Clicar em recusar

**Resultado esperado:** pedido muda para "Recusado"

---

### CT-073 — Marcar sessão como concluída
**Pré-condição:** sessão no horário passado  
**Passos:**
1. Acessar sessão
2. Marcar como concluída

**Resultado esperado:** status muda para "Concluído"

---

### CT-074 — Marcar aluno como não compareceu
**Passos:**
1. Acessar sessão passada
2. Marcar "Não compareceu"

**Resultado esperado:** status muda para "NOSHOW"

---

## 9. Financeiro do Treinador

### CT-080 — Ver histórico de pagamentos
**Passos:**
1. Acessar área financeira

**Resultado esperado:** lista de transações com valor, data e status (aprovado/recusado/reembolsado)

---

## 10. Chat

### CT-090 — Enviar mensagem para treinador
**Pré-condição:** aluno com sessão agendada com o treinador  
**Passos:**
1. Acessar chat com o treinador
2. Digitar e enviar mensagem

**Resultado esperado:** mensagem aparece na conversa

---

### CT-091 — Receber mensagem
**Passos:**
1. Abrir chat enquanto outra parte envia mensagem

**Resultado esperado:** mensagem aparece em tempo real ou ao atualizar

---

## 11. Casos de Erro Gerais

### CT-100 — Sessão expirada
**Passos:**
1. Deixar o navegador aberto sem interação por longo período
2. Tentar fazer qualquer ação autenticada

**Resultado esperado:** redirecionado para login

---

### CT-101 — Sem conexão
**Passos:**
1. Desligar internet
2. Tentar carregar qualquer página

**Resultado esperado:** mensagem de erro amigável; nenhum dado corrompido

---

### CT-102 — Página não encontrada (404)
**Passos:**
1. Acessar URL inexistente (ex: `/qualquer-coisa`)

**Resultado esperado:** página 404 amigável com link para home

---

## Legenda de Status

| Sigla | Resultado |
|-------|-----------|
| ✅ | Passou |
| ❌ | Falhou |
| ⚠️ | Passou parcialmente / observação |
| — | Não testado |
