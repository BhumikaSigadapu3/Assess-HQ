import { useSearchParams } from "react-router-dom";
import { CodingWorkspaceInner } from "./CodingWorkspaceInner.jsx";

export default function CodingWorkspacePage() {
  const [searchParams] = useSearchParams();
  const embedded = searchParams.get("embedded") === "1";
  const questionId = searchParams.get("questionId");
  const examId = searchParams.get("examId");
  const practiceMode = !questionId && !examId;

  return (
    <CodingWorkspaceInner
      examId={examId}
      questionId={questionId}
      embedded={embedded}
      fillHeight={embedded}
      practiceMode={practiceMode}
      className={embedded ? "p-2" : "px-4 py-6"}
    />
  );
}
