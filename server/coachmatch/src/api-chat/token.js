import { handle } from "./lib/http.js";
import { issueToken } from "./service/token.js";

/** POST /chat/token — emite o token Stream do usuário autenticado. */
export const handler = handle((event, user) =>
  issueToken({ userId: user.id, name: user.name, email: user.email })
);
