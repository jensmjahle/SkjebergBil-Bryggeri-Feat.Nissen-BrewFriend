import api from "@/config/axiosConfig.js";

let source = null;
let currentBrewId = null;
const listeners = new Map();

function emit(event, payload) {
  listeners.get(event)?.forEach((fn) => {
    try {
      fn(payload);
    } catch (_err) {
      // keep other listeners alive
    }
  });
}

export function connectBrewLive(brewId) {
  const targetBrewId = String(brewId || "").trim();
  if (!targetBrewId) throw new Error("[brewLive] brewId is required");

  if (source && currentBrewId === targetBrewId) return source;
  if (source) disconnectBrewLive();

  const baseURL = api.defaults.baseURL;
  const url = `${baseURL}/api/live/brews/${encodeURIComponent(targetBrewId)}/stream`;
  source = new EventSource(url);
  currentBrewId = targetBrewId;

  source.addEventListener("open", () => emit("connected", { brewId: targetBrewId }));
  source.addEventListener("error", (err) => emit("error", err));
  source.addEventListener("brewUpdate", (e) => {
    try {
      emit("brewUpdate", JSON.parse(e.data));
    } catch (_err) {
      emit("brewUpdate", { brewId: targetBrewId });
    }
  });
  source.addEventListener("brewDeleted", (e) => {
    try {
      emit("brewDeleted", JSON.parse(e.data));
    } catch (_err) {
      emit("brewDeleted", { brewId: targetBrewId });
    }
  });

  return source;
}

export function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
}

export function off(event, callback) {
  listeners.get(event)?.delete(callback);
}

export function disconnectBrewLive() {
  if (source) {
    source.close();
    source = null;
  }
  currentBrewId = null;
  listeners.clear();
}
