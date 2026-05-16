import mongoose from "mongoose";

const examRegistrationSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

examRegistrationSchema.index({ examId: 1, candidateId: 1 }, { unique: true });
examRegistrationSchema.index({ candidateId: 1, createdAt: -1 });

export default mongoose.model("ExamRegistration", examRegistrationSchema);
