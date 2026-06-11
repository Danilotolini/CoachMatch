import Joi from 'joi';

/**
 * IDs das perguntas PAR-Q definidos no front-end (ClientHealthFormPage.tsx).
 * Cada resposta é 'YES' ou 'NO'.
 */
const PARQ_QUESTION_IDS = ['heart', 'chest_pain', 'dizziness', 'bone_joint', 'medication'];

export const studentHealthSchema = Joi.object({
  // Mapa de respostas ao questionário PAR-Q: { heart: 'NO', chest_pain: 'NO', ... }
  answers: Joi.object()
    .pattern(
      Joi.string().valid(...PARQ_QUESTION_IDS),
      Joi.string().valid('YES', 'NO').required()
    )
    .required()
    .messages({ 'object.base': 'Respostas ao PAR-Q são obrigatórias' }),

  // Observações sobre restrições, lesões ou cirurgias (opcional)
  notes: Joi.string().allow('').default(''),

  // Consentimento LGPD: deve ser true para continuar
  lgpdConsent: Joi.boolean()
    .valid(true)
    .required()
    .messages({ 'any.only': 'Consentimento LGPD é obrigatório' }),

  // Ciência do disclaimer médico: deve ser true para continuar
  medicalDisclaimer: Joi.boolean()
    .valid(true)
    .required()
    .messages({ 'any.only': 'Aceite do disclaimer médico é obrigatório' }),
});
