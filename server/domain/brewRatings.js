// Missing ratings means a legacy brew; [] means all ratings were deleted.
export function brewRatings(brew) {
  if (Array.isArray(brew?.ratings)) return brew.ratings.map(r => ({
    ratingId: r.ratingId, rating: r.rating, note: r.note || '', evaluatedAt: r.evaluatedAt, updatedAt: r.updatedAt,
  }));
  const old = brew?.evaluation;
  return Number(old?.rating) > 0 ? [{ ratingId:'legacy', rating:Number(old.rating), note:old.note || '', evaluatedAt:old.evaluatedAt || brew?.progress?.brewCompletedAt || brew?.timeline?.completedAt || brew?.updatedAt || brew?.createdAt || new Date() }] : [];
}
export function ratingAverage(ratings) {
  return ratings.length ? ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length : null;
}
export function prepareRatings(brew) {
  if (brew.finalNotes === undefined && brew.evaluation?.note) brew.finalNotes = brew.evaluation.note;
  if (!Array.isArray(brew.ratings)) brew.ratings = brewRatings(brew);
}
export function syncEvaluation(brew) {
  const ratings = brewRatings(brew);
  const last = ratings[ratings.length - 1];
  // Legacy recipe statistics keep one aggregate contribution per brew.
  brew.evaluation = ratings.length ? { rating:ratingAverage(ratings), note:brew.finalNotes || '', evaluatedAt:last.evaluatedAt } : undefined;
}
