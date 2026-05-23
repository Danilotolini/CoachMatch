import { createCoach } from "../services/coach-service.js";
import insertCoach, { findCoachById } from "../repositories/coach-repository.js";
import coachValidation from "../validation/validation-coach.js";
 
// Mock das dependências
jest.mock("../repositories/coach-repository.js", () => ({
  __esModule: true,
  default: jest.fn(),
  findCoachById: jest.fn(),
}));
 
jest.mock("../validation/validation-coach.js", () => ({
  __esModule: true,
  default: {
    validate: jest.fn(),
  },
}));
 
describe("coach-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
 
  describe("createCoach", () => {
    const validCoachAttributes = {
      sub: "cognito-user-123",
      email: "joao@exemplo.com",
      name: "João Silva",
    };
 
    describe("quando os atributos são válidos", () => {
      beforeEach(() => {
        coachValidation.validate.mockReturnValue({ error: null });
        insertCoach.mockResolvedValue(undefined);
      });
 
      it("deve chamar a validação com os atributos recebidos", async () => {
        await createCoach(validCoachAttributes);
 
        expect(coachValidation.validate).toHaveBeenCalledWith(validCoachAttributes);
        expect(coachValidation.validate).toHaveBeenCalledTimes(1);
      });
 
      it("deve chamar insertCoach com a estrutura correta para o DynamoDB", async () => {
        await createCoach(validCoachAttributes);
 
        expect(insertCoach).toHaveBeenCalledWith({
          TableName: "coaches",
          Item: {
            coachId: validCoachAttributes.sub,
            email: validCoachAttributes.email,
            status: "PENDING_PROFILE",
            profile: {
              name: validCoachAttributes.name,
            },
          },
        });
      });
 
      it("deve definir o status inicial como PENDING_PROFILE", async () => {
        await createCoach(validCoachAttributes);
 
        const chamada = insertCoach.mock.calls[0][0];
        expect(chamada.Item.status).toBe("PENDING_PROFILE");
      });
 
      it("deve mapear o campo 'sub' do Cognito para 'coachId'", async () => {
        await createCoach(validCoachAttributes);
 
        const chamada = insertCoach.mock.calls[0][0];
        expect(chamada.Item.coachId).toBe(validCoachAttributes.sub);
      });
 
      it("deve mapear o campo 'name' do Cognito para 'profile.name'", async () => {
        await createCoach(validCoachAttributes);
 
        const chamada = insertCoach.mock.calls[0][0];
        expect(chamada.Item.profile.name).toBe(validCoachAttributes.name);
      });
 
      it("deve resolver sem retornar valor", async () => {
        const resultado = await createCoach(validCoachAttributes);
 
        expect(resultado).toBeUndefined();
      });
    });
 
    describe("quando os atributos são inválidos", () => {
      it("deve lançar um erro se a validação falhar", async () => {
        const erroDeValidacao = new Error('"email" is required');
        coachValidation.validate.mockReturnValue({ error: erroDeValidacao });
 
        await expect(createCoach(validCoachAttributes)).rejects.toThrow(
          `Atributos Inválidos ${erroDeValidacao.message}`
        );
      });
 
      it("não deve chamar insertCoach se a validação falhar", async () => {
        coachValidation.validate.mockReturnValue({
          error: new Error("campo inválido"),
        });
 
        await expect(createCoach(validCoachAttributes)).rejects.toThrow();
        expect(insertCoach).not.toHaveBeenCalled();
      });
 
      it("deve incluir o erro original como causa", async () => {
        const erroOriginal = new Error('"name" is required');
        coachValidation.validate.mockReturnValue({ error: erroOriginal });
 
        try {
          await createCoach(validCoachAttributes);
        } catch (err) {
          expect(err.cause).toBe(erroOriginal);
        }
      });
    });
 
    describe("quando o repositório falha", () => {
      it("deve propagar o erro do insertCoach", async () => {
        coachValidation.validate.mockReturnValue({ error: null });
        const erroDoRepositorio = new Error("Falha na conexão com o DynamoDB");
        insertCoach.mockRejectedValue(erroDoRepositorio);
 
        await expect(createCoach(validCoachAttributes)).rejects.toThrow(
          "Falha na conexão com o DynamoDB"
        );
      });
    });
  });
});
 