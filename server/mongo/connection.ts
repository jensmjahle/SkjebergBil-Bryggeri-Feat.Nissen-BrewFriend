import mongoose from "mongoose";

let isConnected = false;

export async function connectMongo() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    return false;
  }

  if (isConnected) {
    return true;
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB || "brewbuddy",
  });

  isConnected = true;
  return true;
}

export function mongoStatus() {
  return {
    enabled: Boolean(process.env.MONGODB_URI),
    readyState: mongoose.connection.readyState,
    dbName:
      mongoose.connection.db?.databaseName ||
      process.env.MONGODB_DB ||
      "brewbuddy",
  };
}
