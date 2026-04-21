import { getDefaultResumeVariant } from "@/lib/resume-variants";
import { ResumePage } from "./ResumePage";

export default function Home() {
  return <ResumePage variant={getDefaultResumeVariant()} />;
}
