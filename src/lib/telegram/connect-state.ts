export type TelegramConnectState =
  | { status: "idle"; error?: string }
  | { status: "pending_code"; error?: string }
  | { status: "pending_password"; error?: string }
  | { status: "connected" }
  | { status: "error"; error: string };
