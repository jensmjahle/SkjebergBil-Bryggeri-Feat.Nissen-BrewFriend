// Mash rests: ordered "heat to X °C, then hold for N minutes" actions in step.data.rests.
export function mashRests(step) {
  const source = Array.isArray(step?.data?.rests) ? step.data.rests : [];
  const seen = new Set();
  return source.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const restId = String(item.restId || "");
    const temperatureC = Number(item.temperatureC);
    const minutes = Number(item.minutes);
    if (!restId || seen.has(restId) || item.temperatureC === "" || item.temperatureC == null || !Number.isFinite(temperatureC) || item.minutes === "" || item.minutes == null || !Number.isFinite(minutes) || minutes < 0) return [];
    seen.add(restId);
    return [{ restId, temperatureC, minutes }];
  });
}
