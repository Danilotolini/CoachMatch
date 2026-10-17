const ENV_VARS = {
  coaches: 'COACHES_TABLE',
  gyms: 'GYMS_TABLE',
  payments: 'PAYMENTS_TABLE',
  schedule: 'SCHEDULE_TABLE',
  specialties: 'SPECIALTIES_TABLE',
  students: 'STUDENTS_TABLE',
};

/**
 * Resolve o nome físico de uma tabela a partir do ambiente.
 *
 * Os stages usam tabelas diferentes na mesma conta, então não há nome default: cair
 * num nome fixo faria um stage ler e escrever nas tabelas de outro sem erro nenhum.
 *
 * @param {keyof typeof ENV_VARS} table - Nome lógico da tabela.
 * @returns {string}
 */
export const tableName = (table) => {
  const envVar = ENV_VARS[table];
  if (!envVar) {
    throw new Error(
      `Tabela desconhecida: recebido '${table}', esperado uma de ${Object.keys(ENV_VARS).join(', ')}`,
    );
  }

  const name = process.env[envVar];
  if (!name) {
    throw new Error(
      `${envVar} não definida: recebido '${name}', esperado o nome da tabela '${table}' do stage (ex.: ${table}-dev)`,
    );
  }
  return name;
};
