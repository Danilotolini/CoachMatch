import studentSchema from "./schemas.js";



export const validateStudent = (student) => {
  return studentSchema.validate(student);
};