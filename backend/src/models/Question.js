import mongoose from "mongoose";

const testCaseSchema = new mongoose.Schema(
  {
    input: String,
    expectedOutput: String,
    isHidden: { type: Boolean, default: true },
    weight: { type: Number, default: 1 }
  },
  { _id: false }
);

const mcqOptionSchema = new mongoose.Schema(
  {
    label: String,
    value: String,
    isCorrect: Boolean
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    type: { type: String, enum: ["mcq", "coding"], required: true },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    sectionKey: { type: String, trim: true },
    topics: [{ type: String, trim: true, lowercase: true }],
    marks: { type: Number, default: 1 },
    negativeMark: { type: Number, default: 0, min: 0 },
    options: [mcqOptionSchema],
    starterCode: { type: Map, of: String },
    testCases: [testCaseSchema],
    supportedLanguages: [String]
  },
  { timestamps: true }
);

questionSchema.index({ examId: 1, sectionKey: 1, difficulty: 1 });
questionSchema.index({ examId: 1, topics: 1 });
questionSchema.index({ createdBy: 1, type: 1, difficulty: 1, createdAt: -1 });

export default mongoose.model("Question", questionSchema);
