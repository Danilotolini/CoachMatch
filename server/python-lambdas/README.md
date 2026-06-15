# Python Lambdas (AWS)

Esta pasta reúne as lambdas escritas em Python que já estão **deployadas na AWS**, mas que ainda **não foram portadas** para o projeto Node (`server/coachmatch/`). Servem como fonte da verdade do que está em produção enquanto a migração para Node não acontece.

> Estes arquivos não fazem parte do build do `serverless` em `server/coachmatch/`. São cópias do código deployado, mantidas no repositório para versionamento e referência.

## Estrutura

- `original/`: cópias das lambdas exatamente como estavam na Amazon no momento em que foram trazidas para o código.
- Arquivos na raiz: versões atuais para uso e evolução no repositório (com os ajustes descritos abaixo).

## Lambdas

### Perfil

- `generate-profile-video-upload-url.py`: gera uma URL pré-assinada (presigned POST) no S3 para upload de arquivos estáticos. Apesar do nome, não é específica de vídeo — aceita qualquer tipo de arquivo (o `Content-Type` vem da requisição e o default é `application/octet-stream`), limitada apenas pelo tamanho máximo (`MAX_BYTES`, 50 MB por padrão) e pelo prefixo `uploads/` na key. O uso atual é o vídeo de apresentação do treinador.

## Ajuste em requisições GET

Algumas lambdas GET originalmente liam parâmetros a partir do corpo da requisição (`event.body`). Isso funciona em ferramentas como Postman, mas navegadores não permitem enviar uma requisição `GET` com corpo.

Por isso, nas versões atuais, as GETs afetadas passam a ler os dados primeiro de `event.queryStringParameters`. O parse do corpo JSON foi mantido como fallback para compatibilidade com clientes que ainda enviem esses dados no body.

As lambdas ajustadas foram:

- `get-coach-schedule-from-parm.py`
- `get-gym-schedule-from-parm.py`
- `get-schedule-requests.py`
