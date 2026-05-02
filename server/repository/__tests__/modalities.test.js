import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn();

vi.mock("../dynamodb-client.js", () => ({
  docClient: { send: sendMock },
}));

const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
const { listAllModalities } = await import("../modalities.js");

describe("repository/modalities", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("retorna a lista de items quando o Scan responde com Items", async () => {
    const items = [
      { id: "1", name: "Musculação" },
      { id: "2", name: "Crossfit" },
    ];
    sendMock.mockResolvedValueOnce({ Items: items });

    const result = await listAllModalities();

    expect(result).toEqual(items);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    expect(command).toBeInstanceOf(ScanCommand);
    expect(command.input).toEqual({ TableName: "modalities" });
  });

  it("retorna array vazio quando o Scan nao retorna Items", async () => {
    sendMock.mockResolvedValueOnce({});

    const result = await listAllModalities();

    expect(result).toEqual([]);
  });

  it("propaga o erro quando o Scan falha", async () => {
    sendMock.mockRejectedValueOnce(new Error("DDB indisponivel"));

    await expect(listAllModalities()).rejects.toThrow("DDB indisponivel");
  });
});
