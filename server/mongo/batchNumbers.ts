import mongoose from 'mongoose';
import { Brew } from './models/Brew.js';

const schema = new mongoose.Schema({ _id: String, value: { type: Number, default: 0 } });
const Counter: any = mongoose.models.BrewCounter || mongoose.model('BrewCounter', schema);

export async function nextBatchNumber(brewerId: any) {
  let counter;
  try {
    counter = await Counter.findOneAndUpdate(
      { _id: String(brewerId) }, { $inc: { value: 1 } }, { upsert: true, new: true },
    );
  } catch (error: any) {
    // Two first-ever requests can race to insert the same counter. The unique
    // _id makes one win; the other must increment that existing counter.
    if (error?.code !== 11000) throw error;
    counter = await Counter.findOneAndUpdate(
      { _id: String(brewerId) }, { $inc: { value: 1 } }, { new: true },
    );
  }
  return counter.value;
}

// Additive, restartable backfill. Never saves an entire historical document or
// changes updatedAt, snapshots, progress, measurements or evaluation.
export async function backfillBatchNumbers() {
  await Counter.init();
  const brewers = await Brew.distinct('brewerId');
  for (const brewerId of brewers) {
    const highest = await Brew.findOne({ brewerId, batchNumber: { $gt: 0 } }).sort({ batchNumber: -1 }).lean();
    await Counter.updateOne({ _id: String(brewerId) }, { $max: { value: highest?.batchNumber || 0 } }, { upsert: true });
    const missing = await Brew.find({ brewerId, batchNumber: null }).sort({ createdAt: 1, _id: 1 }).select('_id').lean();
    for (const brew of missing) {
      const batchNumber = await nextBatchNumber(brewerId);
      await Brew.collection.updateOne({ _id: brew._id, batchNumber: null }, { $set: { batchNumber } });
    }
  }
  await Brew.init();
}
