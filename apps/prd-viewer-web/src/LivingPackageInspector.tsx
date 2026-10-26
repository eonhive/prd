/*
 * Company: EonHive Inc. | Title: Living Homepage Package Inspector
 * Purpose: Connect chapter layers to actual example manifests without opening a second Viewer.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { useEffect, useState } from "react";
import { viewerDemoExampleArchives } from "./viewerDemoContent.js";
import {
  getInspectionLayer,
  loadLivingPackageInspection,
  type DocumentLayer,
  type LivingPackageInspection,
} from "./livingPackageInspection.js";

export function LivingPackageInspector({
  active,
  sample,
  layer,
  basePath,
  onSampleChange,
  onOpenViewer,
}: {
  active: boolean;
  sample: string;
  layer: DocumentLayer;
  basePath: string;
  onSampleChange: (sample: string) => void;
  onOpenViewer: () => void;
}) {
  const [inspection, setInspection] = useState<LivingPackageInspection>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const current = inspection?.sampleId === sample ? inspection : undefined;
  const statusMessage = current
    ? `${current.manifest.title} · ${current.fileCount} packaged files`
    : active
      ? "Loading package details…"
      : "Package details load as you reach this chapter.";

  useEffect(() => {
    if (!active || current) return;
    const controller = new AbortController();
    setError("");
    void loadLivingPackageInspection(sample, basePath, controller.signal)
      .then((result) => {
        // A previous selection may finish after its request has been canceled.
        if (!controller.signal.aborted) setInspection(result);
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Package details could not load.");
        }
      });
    return () => controller.abort();
  }, [active, sample, basePath, attempt, current]);

  return (
    <section className="living-package-inspector" aria-label="Example package inspector">
      <label>
        Inspect an example
        <select value={sample} onChange={(event) => onSampleChange(event.target.value)}>
          {viewerDemoExampleArchives.map((example) => (
            <option key={example.id} value={example.id}>{example.label}</option>
          ))}
        </select>
      </label>
      <p className="living-package-status" role="status">{error || statusMessage}</p>
      {error && (
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Try package details again
        </button>
      )}
      {current && (
        <>
          <dl>
            <div>
              <dt>Profile</dt><dd>{current.manifest.profile}</dd>
            </div>
            <div>
              <dt>Archive</dt>
              <dd>{new Intl.NumberFormat("en-US").format(current.archiveBytes)} bytes</dd>
            </div>
            <div>
              <dt>Entry</dt><dd>{current.manifest.entry}</dd>
            </div>
          </dl>
          <details key={`${sample}-${layer}`}>
            <summary>Inspect {layer === "manifest" ? "manifest.json" : `${layer} declarations`}</summary>
            <pre tabIndex={0} aria-label={`${layer} declarations for ${current.manifest.title}`}>
              <code>{JSON.stringify(getInspectionLayer(current, layer), null, 2)}</code>
            </pre>
          </details>
          <p className="living-small-note">
            Read from this archive and validated when the demo was built.
            The Viewer validates the package again when opened.
          </p>
        </>
      )}
      <button type="button" className="living-text-link" onClick={onOpenViewer}>
        Open this example in the Viewer ↗
      </button>
    </section>
  );
}
