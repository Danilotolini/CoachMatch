import { gymSchema }  from './gymSchema.js';

export const validateGym = (data) => {
  return gymSchema.validate(data);
}
