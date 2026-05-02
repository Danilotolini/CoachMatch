import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn();

vi.mock("../dynamodb-client.js", () => ({
  docClient: { send: sendMock },
}));

const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
const { listAllGoals } = await import("../goals.js");

describe("repository/goals", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("retorna a lista de items quando o Scan responde com Items", async () => {
    const items = [
      { id: "1", name: "Emagrecer" },
      { id: "2", name: "Ganhar massa" },
    ];
    sendMock.mockResolvedValueOnce({ Items: items });

    const result = await listAllGoals();

    expect(result).toEqual(items);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    expect(command).toBeInstanceOf(ScanCommand);
    expect(command.input).toEqual({ TableName: "goals" });
  });

  it("retorna array vazio quando o Scan nao retorna Items", async () => {
    sendMock.mockResolvedValueOnce({});

    const result = await listAllGoals();

    expect(result).toEqual([]);
  });

  it("propaga o erro quando o Scan falha", async () => {
    sendMock.mockRejectedValueOnce(new Error("DDB indisponivel"));

    await expect(listAllGoals()).rejects.toThrow("DDB indisponivel");
  });
});
