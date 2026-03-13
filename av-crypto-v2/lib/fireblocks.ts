import { SignJWT, importPKCS8 } from "jose";

const FIREBLOCKS_BASE_URL = "https://api.fireblocks.io";
const API_KEY = process.env.FIREBLOCKS_API_KEY!;
const SECRET_KEY = process.env.FIREBLOCKS_SECRET_KEY!; // PEM string

function generateNonce(): string {
  // Simple nonce: timestamp + random
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function signJWT(path: string, bodyJson?: object): Promise<string> {
  const privateKey = await importPKCS8(SECRET_KEY, "RS256");
  
  const bodyHash = bodyJson
    ? await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(bodyJson))
      ).then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      )
    : await crypto.subtle.digest("SHA-256", new TextEncoder().encode(""))
        .then((buf) =>
          Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
        );

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    uri: path,
    nonce: generateNonce(),
    iat: now,
    exp: now + 55,
    sub: API_KEY,
    bodyHash,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey);
}

async function fireblocksRequest<T>(path: string, options?: RequestInit & { body?: object }): Promise<T> {
  const token = await signJWT(path, options?.body);

  const res = await fetch(`${FIREBLOCKS_BASE_URL}${path}`, {
    ...options,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fireblocks API ${res.status}: ${text}`);
  }

  return res.json();
}

export interface FireblocksVaultAccount {
  id: string;
  name: string;
  assets: {
    id: string; // e.g. "ETH", "BTC", "SOL"
    total: string;
    available: string;
    pending: string;
    frozen: string;
    lockedAmount: string;
    blockHeight: string;
    blockHash: string;
  }[];
}

export interface FireblocksTransaction {
  id: string;
  assetId: string;
  amount: number;
  fee: number | null;
  netAmount: number;
  status: string;
  txHash: string | null;
  createdAt: number;
  lastUpdated: number;
  operation: string;
  source: { type: string; name: string; id: string };
  destination: { type: string; name: string; id: string };
}

export async function getVaultAccounts(): Promise<FireblocksVaultAccount[]> {
  const data = await fireblocksRequest<{ accounts: FireblocksVaultAccount[] }>(
    "/v1/vault/accounts_paged?limit=500"
  );
  return data.accounts ?? [];
}

export async function getTransactions(params?: {
  after?: number;
  before?: number;
  limit?: number;
}): Promise<FireblocksTransaction[]> {
  const qs = new URLSearchParams();
  if (params?.after) qs.set("after", String(params.after));
  if (params?.before) qs.set("before", String(params.before));
  qs.set("limit", String(params?.limit ?? 200));
  qs.set("orderBy", "createdAt");
  qs.set("sort", "DESC");

  return fireblocksRequest<FireblocksTransaction[]>(
    `/v1/transactions?${qs.toString()}`
  );
}