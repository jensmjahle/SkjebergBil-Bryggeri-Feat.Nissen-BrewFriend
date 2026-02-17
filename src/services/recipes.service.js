import api from "@/config/axiosConfig.js";

const BASE = "/api/recipes";

export async function createRecipe(payload) {
  const { data } = await api.post(BASE, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function uploadRecipeImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await api.post("/api/uploads/image", formData);
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

export async function listRecipeVersions(recipeId) {
  const { data } = await api.get(`${BASE}/${encodeURIComponent(recipeId)}/versions`);
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

export async function createRecipeVersion(recipeId, payload) {
  const { data } = await api.post(
    `${BASE}/${encodeURIComponent(recipeId)}/versions`,
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

export async function deleteRecipeVersion(recipeId) {
  await api.delete(`${BASE}/${encodeURIComponent(recipeId)}`);
}

export async function deleteRecipeFamily(recipeId) {
  await api.delete(`${BASE}/${encodeURIComponent(recipeId)}/group`);
}
