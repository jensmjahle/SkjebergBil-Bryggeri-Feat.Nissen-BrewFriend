import api from "@/config/axiosConfig.js";

const BASE = "/api/brews";

export async function listBrews(filters = {}) {
  const { data } = await api.get(BASE, { params: filters });
  return data;
}

export async function getCurrentBrew() {
  const { data } = await api.get(`${BASE}/current`);
  return data;
}

export async function getBrew(brewId) {
  const { data } = await api.get(`${BASE}/${encodeURIComponent(brewId)}`);
  return data;
}

export async function createBrew(payload) {
  const { data } = await api.post(BASE, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function createPlannedBrewFromRecipe(recipeId, payload = {}) {
  const { data } = await api.post(
    `${BASE}/from-recipe/${encodeURIComponent(recipeId)}`,
    payload,
    { headers: { "Content-Type": "application/json" } },
  );
  return data;
}

export async function updateBrew(brewId, payload) {
  const { data } = await api.patch(
    `${BASE}/${encodeURIComponent(brewId)}`,
    payload,
    { headers: { "Content-Type": "application/json" } },
  );
  return data;
}

export async function startBrew(brewId) {
  const { data } = await api.post(`${BASE}/${encodeURIComponent(brewId)}/start`);
  return data;
}

export async function setCurrentBrewStep(brewId, index) {
  const { data } = await api.patch(
    `${BASE}/${encodeURIComponent(brewId)}/current-step`,
    { index },
    { headers: { "Content-Type": "application/json" } },
  );
  return data;
}

export async function startBrewStep(brewId, stepId, payload = {}) {
  const { data } = await api.post(
    `${BASE}/${encodeURIComponent(brewId)}/steps/${encodeURIComponent(stepId)}/start`,
    payload,
    { headers: { "Content-Type": "application/json" } },
  );
  return data;
}

export async function pauseBrewStep(brewId, stepId) {
  const { data } = await api.post(
    `${BASE}/${encodeURIComponent(brewId)}/steps/${encodeURIComponent(stepId)}/pause`,
  );
  return data;
}

export async function completeBrewStep(brewId, stepId) {
  const { data } = await api.post(
    `${BASE}/${encodeURIComponent(brewId)}/steps/${encodeURIComponent(stepId)}/complete`,
  );
  return data;
}

export async function resetBrewStep(brewId, stepId) {
  const { data } = await api.post(
    `${BASE}/${encodeURIComponent(brewId)}/steps/${encodeURIComponent(stepId)}/reset`,
  );
  return data;
}

export async function saveBrewStepNote(brewId, stepId, note) {
  const { data } = await api.post(
    `${BASE}/${encodeURIComponent(brewId)}/steps/${encodeURIComponent(stepId)}/note`,
    { note },
    { headers: { "Content-Type": "application/json" } },
  );
  return data;
}

export async function addBrewMeasurement(brewId, payload) {
  const { data } = await api.post(
    `${BASE}/${encodeURIComponent(brewId)}/measurements`,
    payload,
    { headers: { "Content-Type": "application/json" } },
  );
  return data;
}

export async function getBrewGraph(brewId, metric = "gravity") {
  const { data } = await api.get(`${BASE}/${encodeURIComponent(brewId)}/graph`, {
    params: { metric },
  });
  return data;
}

export async function deleteBrew(brewId) {
  await api.delete(`${BASE}/${encodeURIComponent(brewId)}`);
}
