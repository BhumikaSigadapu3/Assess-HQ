import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ["platform", "exam", "user"], required: true },
    scopeRef: mongoose.Schema.Types.ObjectId,
    metric: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed,
    dimension: mongoose.Schema.Types.Mixed,
    capturedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

analyticsSchema.index({ scope: 1, metric: 1, capturedAt: -1 });

export default mongoose.model("Analytics", analyticsSchema);
