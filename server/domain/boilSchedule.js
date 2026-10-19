// Minutes are always minutes LEFT in the boil, including zero (flameout).
export function boilAdditions(step, ingredients = []) {
  const duration = Number(step?.durationMinutes);
  const structured = Array.isArray(step?.data?.additions);
  const source = structured ? step.data.additions : legacyBoilAdditions(step);
  const seen = new Set();
  return source
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const linked = ingredients.find(
        (ingredient) => ingredient.ingredientId === item.ingredientId,
      );
      const name = String(linked?.name || item.name || "").trim();
      const minutes =
        item.remainingMinutes === "" || item.remainingMinutes == null
          ? NaN
          : Number(item.remainingMinutes);
      const id = String(item.additionId || "");
      if (
        !id ||
        seen.has(id) ||
        !name ||
        !Number.isFinite(minutes) ||
        minutes < 0 ||
        (duration > 0 && minutes > duration)
      )
        return [];
      seen.add(id);
      return [
        {
          ...item,
          additionId: id,
          name,
          remainingMinutes: minutes,
          amount: item.amount || linked?.amount || "",
          unit: item.unit || linked?.unit || "",
          category: linked?.category || "other",
        },
      ];
    })
    .sort((a, b) => b.remainingMinutes - a.remainingMinutes);
}

export function invalidBoilSchedule(step) {
  const rows = step?.data?.additions;
  if (rows === undefined) return false;
  if (!Array.isArray(rows) || rows.length > 100) return true;
  const ids = new Set();
  return rows.some((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.additionId !== "string" ||
      !item.additionId.trim() ||
      item.additionId.length > 80 ||
      ids.has(item.additionId)
    )
      return true;
    ids.add(item.additionId);
    return (
      (!String(item.ingredientId || "").trim() &&
        !String(item.name || "").trim()) ||
      (item.name != null &&
        (typeof item.name !== "string" || item.name.length > 160)) ||
      (item.ingredientId != null &&
        (typeof item.ingredientId !== "string" ||
          item.ingredientId.length > 80)) ||
      ["amount", "unit"].some(
        (key) =>
          item[key] != null &&
          (typeof item[key] !== "string" || item[key].length > 80),
      ) ||
      typeof item.remainingMinutes !== "number" ||
      !Number.isFinite(item.remainingMinutes) ||
      item.remainingMinutes < 0 ||
      !(Number(step.durationMinutes) > 0) ||
      item.remainingMinutes > Number(step.durationMinutes)
    );
  });
}

export function legacyBoilAdditions(step) {
  return String(step?.data?.hopSchedule || "")
    .split(/[;\n]|(?<=\D),(?=\s*\d+(?:[.,]\d+)?\s*m)|,(?!\d)/)
    .flatMap((text, index) => {
      // Accept explicit timestamps at either end, never infer times from prose.
      const suffix = text.trim().match(/^(.+?)\s*@\s*(\d+(?:[.,]\d+)?)\s*m(?:in(?:utter|utes?)?)?\s*$/i);
      const match = text
        .trim()
        .match(
          /^(\d+(?:[.,]\d+)?)\s*(?:m(?:in(?:utter|utes?)?)?)\b\s*[:\-–]?\s*(.+)$/i,
        );
      const name = suffix ? suffix[1].trim() : match?.[2]?.trim();
      const quantity = name?.match(/^(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|l|tablett(?:er)?|tablets?|ts|tsp)\s+(.+)$/i);
      return match || suffix
        ? [
            {
              additionId: `legacy-${index}`,
              remainingMinutes: Number((suffix ? suffix[2] : match[1]).replace(",", ".")),
              name: quantity ? quantity[3].trim() : name,
              amount: quantity ? quantity[1] : "",
              unit: quantity ? quantity[2] : "",
            },
          ]
        : [];
    });
}

export function boilScheduleState(
  step,
  progress = {},
  remainingSeconds,
  ingredients = [],
) {
  const additions = boilAdditions(step, ingredients);
  const completed = new Set(progress?.completedAdditionIds || []);
  const pending = additions.filter((item) => !completed.has(item.additionId));
  // An overdue, unconfirmed addition stays visible until explicitly acknowledged.
  const next = pending[0] || null;
  const target = (next?.remainingMinutes || 0) * 60;
  const prior = additions
    .filter((item) => item.remainingMinutes * 60 > target)
    .at(-1);
  const total = Math.max(
    1,
    (prior
      ? prior.remainingMinutes * 60
      : Number(step?.durationMinutes || 0) * 60) - target,
  );
  const remaining = Number(remainingSeconds) - target;
  const started = Boolean(
    progress?.startedAt ||
      progress?.activeSinceAt ||
      progress?.status === "active",
  );
  return {
    additions,
    next,
    remaining,
    total,
    target,
    due: Boolean(
      next && started && remaining <= 0 && progress?.status !== "completed",
    ),
    nextGroup: next
      ? pending.filter(
          (item) => item.remainingMinutes === next.remainingMinutes,
        )
      : [],
  };
}

export function formatBoilClock(seconds) {
  const value = Math.abs(Math.floor(Number(seconds) || 0));
  return `${seconds < 0 ? "−" : ""}${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
