// Copia tabelas de referência (academias, especialidades) de prod para o stage dev.
// O seed/ do stage local tem poucos itens; o dev precisa do catálogo real para que
// busca e agenda se comportem como em prod. Dados de usuários não entram.
//
// Uso: node scripts/copy-reference-data.js gyms:gyms-dev specialties:specialties-dev
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TARGET_SUFFIX = '-dev';
const BATCH_SIZE = 25; // limite do BatchWriteItem

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'sa-east-1' }));

const parsePair = (arg) => {
  const [source, target] = arg.split(':');
  if (!source || !target) {
    throw new Error(`Par inválido: recebido '${arg}', esperado <origem>:<destino> (ex.: gyms:gyms-dev)`);
  }
  // A escrita é um PutItem por item: um destino errado sobrescreveria uma tabela de prod.
  if (!target.endsWith(TARGET_SUFFIX)) {
    throw new Error(`Destino recusado: recebido '${target}', esperado uma tabela terminada em '${TARGET_SUFFIX}'`);
  }
  return { source, target };
};

const scanAll = async (table) => {
  const items = [];
  let ExclusiveStartKey;
  do {
    const page = await client.send(new ScanCommand({ TableName: table, ExclusiveStartKey }));
    items.push(...page.Items);
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
};

const writeAll = async (table, items) => {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    let requests = items.slice(i, i + BATCH_SIZE).map((Item) => ({ PutRequest: { Item } }));
    while (requests.length) {
      const result = await client.send(new BatchWriteCommand({ RequestItems: { [table]: requests } }));
      requests = result.UnprocessedItems?.[table] ?? [];
    }
  }
};

const pairs = process.argv.slice(2).map(parsePair);
if (!pairs.length) {
  throw new Error('Nenhuma tabela informada: esperado ao menos um par <origem>:<destino>');
}

for (const { source, target } of pairs) {
  const items = await scanAll(source);
  await writeAll(target, items);
  console.log(`${source} → ${target}: ${items.length} itens`);
}
