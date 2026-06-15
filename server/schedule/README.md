# Schedule Lambdas

Esta pasta contem a base das lambdas de agenda que estavam publicadas na AWS, mas ainda nao estavam versionadas neste repositorio.

## Estrutura

- `original/`: copias das lambdas exatamente como estavam na Amazon no momento em que foram trazidas para o codigo.
- Arquivos na raiz de `server/schedule/`: versoes atuais para uso e evolucao no repositorio.

## Ajuste em requisicoes GET

Algumas lambdas GET originalmente liam parametros a partir do corpo da requisicao (`event.body`). Isso funciona em ferramentas como Postman, mas navegadores nao permitem enviar uma requisicao `GET` com corpo.

Por isso, nas versoes atuais, as GETs afetadas passam a ler os dados primeiro de `event.queryStringParameters`. O parse do corpo JSON foi mantido como fallback para compatibilidade com clientes que ainda enviem esses dados no body.

As lambdas ajustadas foram:

- `get-coach-schedule-from-parm.py`
- `get-gym-schedule-from-parm.py`
- `get-schedule-requests.py`
