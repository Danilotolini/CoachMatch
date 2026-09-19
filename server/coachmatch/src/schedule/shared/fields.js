/** Campos públicos de um schedule expostos a um aluno navegando disponibilidade (sem dados sensíveis do coach). */
export const PUBLIC_SCHEDULE_FIELDS = ['scheduleId', 'coachId', 'gymId', 'price', 'specialtyId', 'startDateTime', 'endDateTime', 'status'];

/** Projeta um item para um subconjunto de campos, preservando apenas os que existem no item. */
export const pickFields = (item, fields) => fields.reduce((acc, field) => {
  if (Object.hasOwn(item, field)) acc[field] = item[field];
  return acc;
}, {});
