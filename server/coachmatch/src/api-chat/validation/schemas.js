import Joi from "joi";

import { ChatValidationError } from "../lib/errors.js";

/** Valida `data` contra `schema` e devolve o valor limpo, ou lança ChatValidationError. */
export const validate = (schema, data) => {
  const { error, value } = schema.validate(data ?? {}, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    throw new ChatValidationError(error.details.map((d) => d.message).join("; "));
  }
  return value;
};

export const createConversationSchema = Joi.object({
  peerId: Joi.string().trim().required(),
});

export const updateConversationSchema = Joi.object({
  name: Joi.string().trim().max(120),
  frozen: Joi.boolean(),
}).min(1);

export const sendMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(5000).required(),
});

export const editMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(5000).required(),
});
