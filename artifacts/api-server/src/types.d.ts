import type { Logger } from "pino";

declare module "http" {
  interface IncomingMessage {
    log: Logger;
  }
}

declare global {
  interface Response {
    readonly ok: boolean;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }
}
