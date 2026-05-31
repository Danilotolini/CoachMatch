# Architecture Decision Record — Adoção de Arquitetura Serverless na AWS

## Status

**Proposto / Aceito**

---

## Contexto

Estamos construindo uma aplicação web com necessidade de baixa complexidade operacional, escalabilidade sob demanda, segurança integrada e entrega rápida. A solução deve suportar autenticação de usuários, APIs backend, persistência de dados e distribuição do frontend com alta disponibilidade.

Para atender esses requisitos, avaliamos uma arquitetura baseada em serviços gerenciados da AWS, utilizando:

- Amazon CloudFront para distribuição do frontend;
- Amazon Route 53 para DNS;
- Amazon Cognito para autenticação e autorização;
- AWS Lambda para execução da lógica backend;
- Amazon DynamoDB para persistência de dados;
- Amazon S3 para hospedagem dos artefatos estáticos, quando aplicável.

---

## Decisão

Decidimos seguir com uma arquitetura serverless na AWS, utilizando serviços gerenciados para reduzir esforço operacional, acelerar o desenvolvimento e permitir escalabilidade automática conforme a demanda da aplicação.

A arquitetura proposta será composta por:

- **Route 53** para gerenciamento do domínio e resolução DNS;
- **CloudFront** como CDN e ponto de entrada da aplicação web;
- **S3** para armazenar os arquivos estáticos do frontend;
- **Cognito** para autenticação dos usuários;
- **Lambda** para implementação das APIs e regras de negócio;
- **DynamoDB** como banco NoSQL principal da aplicação;
- **IAM** para controle de permissões entre os serviços.

---

## Motivadores da Decisão

A escolha por serverless foi motivada pelos seguintes pontos:

- Redução da necessidade de gerenciar servidores, clusters ou infraestrutura operacional;
- Escalabilidade automática para lidar com variação de demanda;
- Modelo de cobrança baseado em uso, adequado para uma aplicação em fase inicial;
- Integração nativa entre os serviços da AWS;
- Menor tempo para construção do MVP;
- Segurança e autenticação com serviços gerenciados;
- Alta disponibilidade nativa dos serviços utilizados.

---

## Trade-offs Avaliados

### Vantagens

A arquitetura serverless reduz significativamente a carga operacional do time, pois elimina a necessidade de provisionar e administrar servidores, balanceadores, bancos relacionais ou clusters de aplicação.

Também permite maior velocidade de entrega, já que o time consegue focar mais na lógica de negócio e menos em infraestrutura. Além disso, serviços como Lambda, DynamoDB, Cognito e CloudFront possuem integração nativa, facilitando a implementação de autenticação, APIs, persistência e distribuição global da aplicação.

Outro ponto positivo é o modelo de custo inicial. Para aplicações com baixo ou médio volume de uso, o modelo pay-per-use tende a ser mais econômico do que manter infraestrutura provisionada continuamente.

---

### Desvantagens

A principal desvantagem é o aumento do **lock-in com a AWS**. Ao utilizar serviços como Cognito, DynamoDB e Lambda, a aplicação passa a depender fortemente de APIs, padrões e mecanismos específicos da AWS.

Uma eventual migração para outro provedor de nuvem exigiria reescrita parcial ou significativa da aplicação, principalmente nas camadas de autenticação, persistência e execução backend.

Também existem limitações técnicas a serem consideradas, como:

- Tempo máximo de execução das Lambdas;
- Cold start em determinados cenários;
- Modelagem específica exigida pelo DynamoDB;
- Maior complexidade para testes locais e debugging;
- Dependência dos limites e quotas dos serviços AWS;
- Possível aumento de custo em cenários de alto volume ou uso mal dimensionado.

## Consequências

Com essa decisão, esperamos acelerar a entrega da aplicação, reduzir esforço operacional e permitir crescimento gradual da solução sem necessidade de grandes investimentos iniciais em infraestrutura.

Por outro lado, a arquitetura exigirá maior disciplina na modelagem do DynamoDB, no controle de permissões IAM, na observabilidade das Lambdas e no acompanhamento dos custos.

Também será necessário aceitar que a aplicação ficará fortemente orientada ao ecossistema AWS, tornando uma futura migração mais custosa.
