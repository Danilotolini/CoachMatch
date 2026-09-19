import { createClient } from '../../shared/config.js';
import { scanAll } from '../../shared/paginate.js';

const TABLE = 'specialties';

/**
 * Scan completo da tabela. Aceitável aqui porque a tabela de specialties é
 * pequena (dezenas de itens), raramente muda e a resposta é cacheada por 1h.
 */
export const scanAllSpecialties = () => scanAll(createClient(), { TableName: TABLE });
