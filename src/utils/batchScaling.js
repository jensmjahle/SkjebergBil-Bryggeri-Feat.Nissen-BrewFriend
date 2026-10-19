export function scaleIngredientAmountText(amountValue, ratio) {
  if (amountValue === null || amountValue === undefined) return amountValue;
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio === 1) return amountValue;
  const rawText = String(amountValue).trim();
  if (!rawText) return amountValue;

  const normalized = rawText.replace(",", ".");
  if (!/^-?\d+(\.\d+)?(?:\/\d+)?$/.test(normalized)) return amountValue;

  const [numerator, denominator = "1"] = normalized.split("/");
  const amount = Number(numerator) / Number(denominator);
  if (!Number.isFinite(amount)) return amountValue;

  const scaled = amount * ratio;
  const rounded = Math.round(scaled * 1000) / 1000;
  let text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(3).replace(/\.?0+$/, "");

  if (rawText.includes(",")) text = text.replace(".", ",");
  return text;
}


// Only change an explicit quantity at the start of a timestamped addition.
// Other numbers may be part of ingredient names, fractions or instructions.
export function scaleBoilScheduleText(text, ratio) {
  if (typeof text !== "string") return text;
  return text
    .split(/([;\n]|(?<=\D),(?=\s*\d+(?:[.,]\d+)?\s*m)|,(?!\d))/)
    .map((part) => {
      const leadingTime = part.match(/^(\s*\d+(?:[.,]\d+)?\s*m(?:in(?:utter|utes?)?)?\b\s*[:\-–]?\s*)/i);
      const prefix = leadingTime?.[1] || part.match(/^\s*/)[0];
      const addition = part.slice(prefix.length);
      if (!leadingTime && !/@\s*\d+(?:[.,]\d+)?\s*m(?:in(?:utter|utes?)?)?\s*$/i.test(addition)) return part;
      return prefix + addition.replace(/^(\d+(?:[.,]\d+)?(?:\/\d+)?)(\s*)(kg|mg|g|ml|l|tablett(?:er)?|tablets?|ts|tsp)(?=\s)/i,
        (_, amount, space, unit) => `${scaleIngredientAmountText(amount, ratio)}${space}${unit}`);
    })
    .join("");
}
