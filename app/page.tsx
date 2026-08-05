import type { Metadata } from "next";
import { EngineWorkbench } from "@/components/engine-workbench";

export const metadata: Metadata = {
  title: "Two-stroke timing workbench",
  description:
    "Calculate port timing, rotary inlet overlap, compression, squish and geometric time-area in real time.",
};

export default function Home() {
  return <EngineWorkbench />;
}
