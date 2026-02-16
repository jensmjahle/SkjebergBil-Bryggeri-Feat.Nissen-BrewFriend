import api from "@/config/axiosConfig.js";

const BASE = "/api/recipes";

export async function createRecipe(payload) {
  const { data } = await api.post(BASE, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function listRecipes(filters = {}) {
  const { data } = await api.get(BASE, { params: filters });
  return data;
}

export async function getRecipe(recipeId) {
  const { data } = await api.get(`${BASE}/${encodeURIComponent(recipeId)}`);
  return data;
}

export async function updateRecipe(recipeId, payload) {
  const { data } = await api.patch(
    `${BASE}/${encodeURIComponent(recipeId)}`,
    payload,
    {
      headers: { "Content-Type": "application/json" },
    },
  );
  return data;
}

export async function deleteRecipe(recipeId) {
  await api.delete(`${BASE}/${encodeURIComponent(recipeId)}`);
}
