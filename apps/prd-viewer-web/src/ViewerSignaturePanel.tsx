/*
 * Company: EonHive Inc. | Title: Viewer Signature Status
 * Purpose: Present verification results and let readers pin an independently trusted public key.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { useEffect, useRef, useState } from "react";
import {
  applyPrdSignatureTrust, getPrdSignerKeyId, importPrdPublicKey,
  type PrdSignatureResult
} from "@eonhive/prd-validator/signature";

export function ViewerSignaturePanel({ result }: { result: PrdSignatureResult }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestResult = useRef(result);
  latestResult.current = result;
  const request = useRef(0);
  const [trust, setTrust] = useState<{ result: PrdSignatureResult; keyId: string }>();
  const [failure, setFailure] = useState<{ result: PrdSignatureResult; message: string }>();
  useEffect(() => () => { request.current += 1; }, []);
  const trustedKeyId = trust?.result === result ? trust.keyId : undefined;
  const shown = applyPrdSignatureTrust(result, trustedKeyId);
  const labels = {
    unsigned: "Unsigned", verified: "Verified with selected key", untrusted: "Signer not trusted",
    invalid: "Signature invalid", unsupported: "Signature check unavailable"
  };

  async function selectPublicKey(file: File) {
    const attempt = ++request.current;
    const expectedResult = result;
    try {
      if (file.size > 64 * 1024) throw new Error("The public-key file exceeds the 64 KiB limit.");
      const keyId = await getPrdSignerKeyId(await importPrdPublicKey(await file.text()));
      if (attempt !== request.current || latestResult.current !== expectedResult) return;
      setTrust({ result: expectedResult, keyId });
      setFailure(keyId === expectedResult.keyId ? undefined : {
        result: expectedResult, message: "The selected public key does not match this signing key."
      });
    } catch (error) {
      if (attempt !== request.current || latestResult.current !== expectedResult) return;
      setTrust(undefined);
      setFailure({ result: expectedResult, message: error instanceof Error ? error.message : "Could not read the public key." });
    }
  }

  return (
    <section className="panel package-signature-panel" aria-label="Digital signature" data-signature-status={shown.status}>
      <h2>Digital signature</h2>
      <p role="status"><strong>{labels[shown.status]}</strong></p>
      <p>{shown.message}</p>
      {shown.keyId && <p>Signing key<br /><code style={{ overflowWrap: "anywhere" }}>{shown.keyId}</code></p>}
      {shown.checkedFiles !== undefined && <p>{shown.checkedFiles} packaged files checked.</p>}
      {(shown.status === "untrusted" || shown.status === "verified") && <>
        <p>Choose a public key you already trust. Embedded keys are not trusted automatically.</p>
        <button type="button" className="secondary-action" onClick={() => inputRef.current?.click()}>Verify with public key</button>
        <input ref={inputRef} type="file" hidden accept=".pem,.pub" aria-label="Select trusted public key" onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) void selectPublicKey(file);
        }} />
        {trustedKeyId && <button type="button" className="secondary-action" onClick={() => {
          request.current += 1;
          setTrust(undefined);
          setFailure(undefined);
        }}>Clear verification key</button>}
      </>}
      {failure?.result === result && <p role="alert">{failure.message}</p>}
    </section>
  );
}
