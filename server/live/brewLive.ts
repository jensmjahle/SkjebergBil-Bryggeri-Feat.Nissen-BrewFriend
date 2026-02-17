import type { Response } from "express";

type BrewClient = {
  res: Response;
};

const brewClients = new Map<string, Set<BrewClient>>();
const KEEP_ALIVE_MS = 25000;

function writeSse(res: Response, event: string, payload: any) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (_err) {
    // connection likely closed
  }
}

export function addBrewClient(brewId: string, res: Response) {
  if (!brewClients.has(brewId)) {
    brewClients.set(brewId, new Set());
  }
  const bucket = brewClients.get(brewId)!;
  const client = { res };
  bucket.add(client);

  writeSse(res, "connected", { brewId, connectedAt: new Date().toISOString() });

  const ping = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (_err) {
      clearInterval(ping);
      removeBrewClient(brewId, res);
    }
  }, KEEP_ALIVE_MS);

  return () => {
    clearInterval(ping);
    removeBrewClient(brewId, res);
  };
}

export function removeBrewClient(brewId: string, res: Response) {
  const bucket = brewClients.get(brewId);
  if (!bucket) return;

  for (const client of bucket) {
    if (client.res === res) {
      bucket.delete(client);
      break;
    }
  }

  if (!bucket.size) {
    brewClients.delete(brewId);
  }
}

export function broadcastBrewUpdate(brewId: string, payload: any = {}) {
  const bucket = brewClients.get(brewId);
  if (!bucket?.size) return;

  const data = {
    brewId,
    updatedAt: new Date().toISOString(),
    ...payload,
  };

  for (const client of bucket) {
    writeSse(client.res, "brewUpdate", data);
  }
}

export function broadcastBrewDeleted(brewId: string) {
  const bucket = brewClients.get(brewId);
  if (!bucket?.size) return;

  const data = {
    brewId,
    deletedAt: new Date().toISOString(),
  };

  for (const client of bucket) {
    writeSse(client.res, "brewDeleted", data);
  }
}
