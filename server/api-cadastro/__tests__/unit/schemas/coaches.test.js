import Joi from "joi";

const coachSchema = Joi.object({
  coachId: Joi.string().uuid().required(),
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  status: Joi.string().valid("PENDING_PROFILE", "APPROVED"),
});

describe("coachSchema", () => {
  it("valida payload completo e valido", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      email: "coach@test.com",
      status: "APPROVED",
    });
    expect(error).toBeUndefined();
  });

  it("valida com apenas coachId", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(error).toBeUndefined();
  });

  it("rejeita quando coachId esta ausente", () => {
    const { error } = coachSchema.validate({ email: "a@b.com" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("coachId");
  });

  it("rejeita coachId que nao e uuid v4", () => {
    const { error } = coachSchema.validate({ coachId: "123-nao-uuid" });
    expect(error).toBeDefined();
  });

  it("rejeita coachId numerico", () => {
    const { error } = coachSchema.validate({ coachId: 12345 });
    expect(error).toBeDefined();
  });

  it("rejeita email sem @", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      email: "semarvoba.com",
    });
    expect(error).toBeDefined();
  });

  it("rejeita email sem dominio", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      email: "coach@",
    });
    expect(error).toBeDefined();
  });

  it("rejeita email com espacos", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      email: "coach @email.com",
    });
    expect(error).toBeDefined();
  });

  it("aceita status APPROVED", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      status: "APPROVED",
    });
    expect(error).toBeUndefined();
  });

  it("aceita status PENDING_PROFILE", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      status: "PENDING_PROFILE",
    });
    expect(error).toBeUndefined();
  });

  it("rejeita status arbitrario", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      status: "QUALQUER_COISA",
    });
    expect(error).toBeDefined();
  });

  it("rejeita campos desconhecidos por padrao do Joi", () => {
    const { error } = coachSchema.validate({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      campoDesconhecido: "valor",
    });
    expect(error).toBeDefined();
  });

  it("retorna mensagem de erro descritiva", () => {
    const { error } = coachSchema.validate({});
    expect(typeof error.details[0].message).toBe("string");
    expect(error.details[0].message.length).toBeGreaterThan(0);
  });
});
