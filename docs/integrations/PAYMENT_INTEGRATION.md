# 💳 Payment Integration — Mock to Production

## Overview

O sistema de pagamento foi completamente refatorado para seguir as **melhores práticas** do projeto:

- ✅ **PaymentPage** agora integrado com API real (MSW em dev)
- ✅ Removido `setTimeout` — usa React Query + useMutation
- ✅ Padrão consistente com OnboardingPage
- ✅ Tipos TypeScript strict end-to-end
- ✅ Error handling completo
- ✅ Pronto para migração para produção

---

## 🧪 Como Testar Localmente

### Teste 1: Cartão Aprovado
```
1. Abra a página de pagamento
2. Selecione "Cartão de Crédito"
3. Número: 4111 1111 1111 1111
4. Nome: JOÃO SILVA
5. Validade: 12/25
6. CVV: 123
7. Clique "Pagar R$ 180,00"
8. ✅ Resultado: "Pagamento Confirmado!"
```

### Teste 2: Cartão Recusado
```
1. Número: 4222 2222 2222 2222
2. Preencha outros dados
3. Clique "Pagar"
4. ✅ Resultado: "Pagamento Recusado" com botão "Tentar novamente"
```

### Teste 3: Pagamento Pendente
```
1. Número: 4333 3333 3333 3333
2. Preencha outros dados
3. Clique "Pagar"
4. ✅ Resultado: "Aguardando Confirmação"
```

### Teste 4: PIX
```
1. Selecione "PIX"
2. Veja QR Code
3. Clique "Já realizei o pagamento"
4. ✅ Resultado: "Pagamento Confirmado!"
```

---

## 📁 Arquivos Alterados

### Novos Arquivos
- `client/src/api/payments.ts` — API functions
- `client/src/hooks/useCreatePayment.ts` — React Query hook

### Modificados
- `client/src/types/api.ts` — Adicionados tipos de Payment
- `client/src/mocks/handlers.ts` — Adicionados 3 endpoints de pagamento
- `client/src/pages/PaymentPage.tsx` — Integração com API

---

## 🔄 Fluxo de Dados

```
PaymentPage.tsx
  ↓
useCreatePayment() [React Query]
  ↓
createPayment() [api/payments.ts]
  ↓
apiPost('/payments') [lib/http.ts]
  ↓
MSW Handler [mocks/handlers.ts]
  ↓
Transaction Response
  ↓
onSuccess → setCardStatus('approved') → PaymentResult
```

---

## 🚀 Migração para Produção

### 1. Remover MSW handlers
Delete `mocks/handlers.ts` ou comente payment handlers

### 2. Apontar para API real
```typescript
// .env.production
VITE_API_BASE_URL=https://api.coachmatch.com.br
```

### 3. Update `api/payments.ts` (se necessário)
```typescript
// Sem mudanças necessárias! Já genérico:
export function createPayment(payload: PaymentPayload): Promise<Transaction> {
  return apiPost<Transaction>('/payments', payload)  // ✅ Funciona com qualquer baseUrl
}
```

### 4. Backend deve seguir o contrato:

```javascript
// POST /payments
Request:  { sessionId, method, card?, amount, coachId, studentId }
Response: { transactionId, sessionId, coachId, studentId, method, amount, status, cardLastFour, split, createdAt }

// GET /payments/:transactionId
Response: Transaction

// POST /payments/:transactionId/refund
Response: Refund Transaction
```

---

## ✅ Checklist de Qualidade

- ✅ TypeScript strict (sem `any`)
- ✅ Padrão consistente (useMutation pattern)
- ✅ Error handling (displays error card)
- ✅ Loading states (spinner, disabled buttons)
- ✅ Acessibilidade (Material Symbols, semantic HTML)
- ✅ Responsive (mobile/desktop)
- ✅ UI/UX idêntica (visual não mudou)
- ✅ Sem breaking changes
- ✅ Reutilizável (api/payments.ts, hooks/useCreatePayment.ts)

---

## 📊 Métricas

| Métrica | Antes | Depois |
|---------|-------|--------|
| Padrão HTTP | ❌ setTimeout | ✅ Real API |
| Types | ❌ Loose | ✅ Strict |
| Errors | ❌ None | ✅ Handled |
| Reutilização | ❌ Inline | ✅ Modules |
| Consistency | ❌ Diverge | ✅ = OnboardingPage |
| Produção-ready | ❌ Não | ✅ Sim |

---

## 🔗 Referências

- Padrão: `pages/OnboardingPage.tsx` (usar useMutation)
- HTTP: `lib/http.ts` (apiPost, apiGet)
- React Query: `hooks/useCoachMe.ts` (useQuery, useMutation)
- Types: `types/api.ts` (interface estruturas)

---

**Desenvolvido com padrões senior-grade ✨**
