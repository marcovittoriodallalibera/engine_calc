import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { EngineWorkbench } from "@/components/engine-workbench";
import { pistonTravelFromTdc } from "@/lib/engine";
import {
  cloneDemonstrationProject,
  parseProjectJson,
  serialiseProject,
} from "@/lib/project/model";
import "@/app/globals.css";

const CANONICAL_WEB_URL = "https://phase-360-engine-calculator.mdl1982.chatgpt.site/";

const reference = pistonTravelFromTdc({
  strokeMm: 51,
  rodLengthMm: 97,
  crankAngleDeg: 33,
});
if (!reference.valid || !reference.value) {
  throw new Error("Desktop calculation self-check failed");
}

const projectRoundTrip = parseProjectJson(
  serialiseProject(cloneDemonstrationProject()),
);
if (!projectRoundTrip.ok) {
  throw new Error("Desktop project self-check failed");
}

document.documentElement.dataset.phase360KernelReference =
  reference.value.travelFromTdcMm.toFixed(12);
document.documentElement.dataset.phase360ProjectRoundTrip = "true";

const root = document.getElementById("root");
if (!root) throw new Error("Desktop renderer root is missing");

createRoot(root).render(
  <StrictMode>
    <EngineWorkbench
      shareBaseUrl={CANONICAL_WEB_URL}
      updateLocationOnShare={false}
    />
  </StrictMode>,
);

window.requestAnimationFrame(() => {
  document.documentElement.dataset.phase360Ready = "true";
});
