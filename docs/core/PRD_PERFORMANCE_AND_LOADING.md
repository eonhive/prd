# PRD_PERFORMANCE_AND_LOADING.md
_Last updated: October 30, 2026_
_Status: Performance and loading draft v0.1_

## 1. Purpose

This document defines the current executable PRD baseline for performance and loading behavior.

Its job is to make PRD's loading story explicit without inventing streaming, range-request, or network semantics that the current format and reference stack do not actually guarantee.

---

## 2. Scope

This draft defines:

- the current loading baseline for core PRD packages
- the distinction between packaging strategy and runtime loading strategy
- the current reference viewer loading truth
- practical guidance for larger works under the current foundation

This draft does not define:

- manifest size limits
- streaming or range-request requirements
- worker-based unzip requirements
- lazy section fetch requirements
- package mutation or optimization behavior
- future advanced renderer performance tiers

---

## 3. Loading Philosophy

Current loading direction:

- PRD core remains packaged-first and offline-first
- base validity does not depend on live services
- packaged structure and portability matter more than speculative optimization claims
- segmentation and cross-package relationships must not be mistaken for load graphs

The current reference stack should tell the truth plainly:

- packages are validated as packaged files
- the reference viewer eagerly loads one package into memory
- any media-level lazy presentation remains implementation detail, not format canon

---

## 4. Current Executable Baseline

The current executable loading baseline is:

- one package opens from one manifest
- the public readable path is package-local
- current core validity does **not** require:
  - streaming
  - range requests
  - workers
  - partial unzip
  - lazy section fetch
- the current reference viewer baseline is **eager whole-package in-memory loading**

This means a valid PRD package is not invalid simply because a reference viewer opens it eagerly.

---

## 5. Packaging Strategy vs Loading Strategy

PRD currently has several packaging rules that improve discipline without creating runtime loading guarantees.

### 5.1 Segmentation

`general-document` segmentation is a packaging rule for larger single-package works.

It means:

- one document root may reference packaged section files
- the package stays smaller and more maintainable than one giant `content/root.json`

It does **not** mean:

- lazy loading is required
- viewers owe section-by-section fetch behavior
- segmented sections define a network or streaming contract

### 5.2 Collection and series metadata

Collection and series metadata relate multiple PRD packages to one another.

They mean:

- ordered or grouped relationships can be declared durably

They do **not** mean:

- one package loads another automatically
- viewers owe cross-package prefetch behavior
- the manifest defines a package load graph

### 5.3 Attachments

Attachments remain supplemental material.

They must not block the base open path, and linked attachments do not redefine PRD's packaged-first loading baseline.

---

## 6. Practical Guidance For Larger Works

Under the current core baseline, larger ongoing works should prefer:

1. segmentation for one larger `general-document`
2. multiple PRD packages tied together through series metadata for serialized works
3. packaged assets in core
4. linked attachments only as supplemental references

This keeps PRD smaller and more portable without pretending the current stack already guarantees advanced loading behavior.

---

## 7. Reference Tooling Guidance

The current reference tooling should expose loading-relevant facts truthfully.

Useful inspection facts include:

- file count
- total bytes
- asset and attachment counts
- localization presence
- segmentation presence
- entry mode
- the current reference load mode

Those facts inform tooling and users, but they do not create new validity rules by themselves.

---

## 8. Open Questions

- When should PRD define optional performance tiers for advanced viewers?
- When should worker-based unzip or progressive section loading become capability-level behavior instead of implementation detail?
- Should later drafts define non-normative package-size guidance for publishers without turning size into validity?
- How should future renderer optimizations stay truthful without confusing packaging strategy with loading guarantees?

---

## 9. Measured Implementation Baseline (October 26, 2026)

The [source-verified architecture assessment](../architecture/PRD_ARCHITECTURE_ASSESSMENT_2026-10-26.md#6-performance-baseline-and-optimization-proposals) records reproducible Node and desktop-browser measurements against the source tree of `origin/main` commit `53314f4dcd6c7e327406ef633710c03dcd980a6e`.

- Node: one warmup plus five samples per fixture/strategy, isolated processes, warm filesystem cache. Open includes read, eager unzip, validation and viewer-core root parsing; it excludes browser presentation and app-level section/locale resolution.
- Browser: actual Viewer/file chooser in a development build; a visible observer times two frames after ready document DOM commit. This is not production first-paint measurement.
- The 1,000-section fixture mounts 12,167 DOM elements and reaches that checkpoint in 295–764 ms. Small examples open quickly in Node; large assets expose a larger process-memory footprint.
- A content-only unzip experiment reduces materialization but intentionally skips asset validation/rendering. It is not an equivalent valid-package loader and changes no conformance guarantees.

Reproduce with `pnpm build` then `node scripts/architecture-baseline.mjs --browser-fixtures`. The report defaults to `examples/dist/architecture-baseline.json`; generated browser fixtures remain ignored under the app's `public/examples/architecture-audit/`. Raw [Node](../architecture/baselines/2026-10-26-node.json) and [browser](../architecture/baselines/2026-10-26-browser.json) snapshots accompany the assessment.

The eager baseline remains current. Production/mobile traces and actual browser/GPU peak memory remain follow-up measurements. Compare native containment and on-demand resource preparation before adopting workers, virtualization or network loading. No optimization or new loading guarantee is accepted by this note.

## 10. Bounded Archive Decoding (October 27, 2026)

The [container contract](PRD_CONTAINER_FORMAT.md) adds shared pre-read compressed-size checks, central-directory preflight and chunked local-member decoding with declared/actual expanded-byte, member and count limits. Both legacy ZIP and the opt-in PRD envelope use this path. Chunking here bounds decoder work and retained output; the entire compressed package and final logical file map are still materialized in memory. It adds no streaming/range/worker/lazy-section conformance claim.

The October 26 raw snapshots above remain historical measurements of the prior `unzipSync` path. They are not performance claims for the bounded decoder. Reprofile this path before selecting additional loading optimizations; browser Blob/decoded-image memory remains outside archive byte budgets.

## 11. Bounded Directory Loading (October 28, 2026)

PRD-049 extends resource policies to authoring directories using one shared Node reader for validation, inspection and packaging. Defaults match archive per-file/total/count budgets, with directory counts including all visited entries and no compressed-size equivalent. Incremental directory enumeration, opened-file metadata checks and bounded actual-byte reads replace two unrestricted collectors. Limits are configurable through optional library arguments; CLI commands inherit defaults. See [directory policy and diagnostics](PRD_CONTAINER_FORMAT.md#unpacked-directory-policy).

The collected file map remains eager and can overlap with temporary chunks and archive buffers. These are I/O/retention budgets, not exact process-memory limits, a performance improvement measurement or a filesystem sandbox. Source trees must remain stable. The historical baselines above remain unchanged; production/mobile profiling and broader archive/HTML isolation still need their own acceptance evidence.

## 12. Indexed ZIP Records And CRC (October 28, 2026)

PRD-050 replaces archive-marker scanning with bounded record preflight and indexed member slices. DEFLATE still uses the existing `fflate` inflater in 1,024-byte compressed pushes; stored data follows the same actual-byte checks. CRC-32 updates across decoded chunks and must match before complete member buffers are returned. ZIP64 fields, descriptors, central extents and local ranges are checked before decompression. See the [ZIP integrity policy](PRD_CONTAINER_FORMAT.md#zip-integrity-policy).

Both transports, eager loading and configurable reference budgets remain unchanged. CRC adds work and makes no speed/peak-memory improvement claim. The historical audit snapshots still predate this path; production/constrained-device profiling remains open. Browser integrity rejection/recovery needs its own live acceptance when browser use is enabled; bounded unit/CLI fixtures and the current build do not prove that interaction.

## 13. Current Loader Measurements And Stored Windows (October 29, 2026)

`scripts/loader-baseline.mjs` measures the current `readPrdArchive` path rather than the older audit harness's `unzipSync` experiment. It reuses the same eight fixtures: five canonical examples, 1,000 sections / 5,000 paragraphs, 32 MiB of binary assets and four 4096² PNG panels. Each fixture has stored/level-0 and DEFLATE/level-6 ZIP payloads, tested as ordinary ZIP and the PRD envelope: **32 cases**. Fixed ZIP timestamps and complete decoded-file digests make byte parity reviewable.

```sh
pnpm build
node scripts/loader-baseline.mjs --out examples/dist/loader-baseline.json
node scripts/loader-baseline.mjs --out examples/dist/loader-comparison.json --compare examples/dist/loader-baseline.json
```

Use `--fixtures long-1000-sections,assets-32-mib,images-4x4096` for the bounded stress subset and `--samples 5` to select measured repetitions (1–25). Comparisons require identical case sets, archive/logical hashes, sample counts, reference budgets and Node/OS/CPU facts. They report changes without a timing threshold. Build before measuring, run comparisons sequentially and avoid running a test/build workload beside them. The harness rejects a built implementation change during its run. The historical audit command and October 26 snapshots remain unchanged in meaning.

Method: one warmup plus five measured warm-cache samples in a fresh `--expose-gc` child per case, GC before repetitions. Read, bounded decode/CRC/materialization, semantic validation and viewer-core root interpretation are timed separately. Every returned file is hashed outside timing and compared with the fixture source. No asset/validation skipping is used. Lifetime peak RSS includes imports, warmup and digest checks; after-open memory snapshots are not transient peaks. This is an interactive Apple M1/macOS host, Node 24.5.0; unrelated background activity was not controlled. Medians are observations, not statistical confidence intervals or performance contracts.

Raw evidence: [before](../architecture/baselines/2026-10-29-loader-before.json), [final stored-window change](../architecture/baselines/2026-10-29-loader-after.json) and [independent stress rerun](../architecture/baselines/2026-10-29-loader-confirmation.json). Each records built-module hashes, fixture hashes, individual samples, byte counts and process memory. These snapshots are a new baseline, not an equivalent comparison with the less restrictive October 26 decoder.

### Selected implementation

Stored members now use **64 KiB input windows** instead of 1 KiB. A stored record's compressed and original sizes must already match, so the larger source window cannot decompress into extra output. The same receive path checks actual per-file/total/declared lengths and CRC before retaining each window. The final file buffer remains independent of the input archive. DEFLATE keeps 1 KiB compressed pushes and the existing inflater/checks. No new dependency, worker, format/API/diagnostic change, streaming capability or default-writer migration is introduced.

For the eight 4 MiB stored assets, window/view/callback count falls from 32,768 to 512 for asset data. The retained file map is still the complete eager package. Representative stored-member results from the full run:

| Fixture / transport, level 0 | Decode before | Decode after | Peak RSS before / after |
| --- | ---: | ---: | ---: |
| 1,000 sections / ZIP | 11.983 ms | 11.109 ms | 103.8 / 101.1 MiB |
| 1,000 sections / PRD envelope | 14.070 ms | 9.816 ms | 103.5 / 99.7 MiB |
| 32 MiB assets / ZIP | 192.468 ms | 177.419 ms | 189.0 / 186.3 MiB |
| 32 MiB assets / PRD envelope | 200.957 ms | 173.954 ms | 189.7 / 186.6 MiB |
| Four PNG panels / ZIP | 55.802 ms | 41.897 ms | 89.3 / 89.1 MiB |
| Four PNG panels / PRD envelope | 43.028 ms | 41.151 ms | 92.3 / 89.3 MiB |

The stress rerun measured stored assets at 176.927 / 173.780 ms and stored PNGs at 41.363 / 41.288 ms for ZIP/envelope respectively. Small level-6 ZIP totals in the final run are 0.736–1.156 ms for Resume, Segmented, Storyboard and Document Basic; Comic Basic is 10.189 ms. These exclude browser rendering, locale/section expansion and media decoding. Compression/transport choices are not universally ordered by these samples; the envelope retains the same logical package plus its 16-byte header.

### Trials and remaining limits

- A CPU sample of the initial 32 MiB DEFLATE case placed about 42% of sampled process time in `receive`/`updateCrc32`, and substantial time in inflater buffer copying. That sample includes warmup, hashing and process overhead. The raw profile/summary is ignored under `examples/dist/loader-baseline-qa/`.
- [Indexed CRC trial](../architecture/baselines/2026-10-29-loader-indexed-trial.json): lower decode medians, but compressed-image peak RSS reached 283–284 MiB and repeated near 287–290 MiB. It was reverted; no causal GC claim or general memory improvement is established.
- [Single stored slice trial](../architecture/baselines/2026-10-29-loader-single-stored-trial.json): fewer windows but slower medium stored fixtures. It was reverted in favor of bounded 64 KiB windows.
- Unchanged DEFLATE controls also vary: the final full run's image peaks are about 140–141 MiB, while the stress rerun's envelope case reaches 261 MiB. Node GC/allocation and host variance prevent a consistent memory-saving claim. Transient inflater allocations remain an investigation before changing decoder strategy or compressed push size.

No app render, first paint, navigation, browser/GPU memory, physical device, cold-storage, signature-verification or inactive-locale/Blob allocation measurement is supplied here. Fresh browser inventory still reports local browser use disabled in Work settings. Items 54/56 remain open; item 60's Node reprofiling portion is complete, while any writer migration and release/consumer decision remain separate. Do not introduce workers, virtualization, selective validity or new loading guarantees from these Node results.

## 14. Allocation Investigation And Viewer Blob Preparation (October 30, 2026)

### Rejected DEFLATE output-buffer trial

The next experiment copied decoded chunks directly into one buffer sized to the preflighted member length, allocated after the first checked nonempty chunk. It preserved decoded bytes, CRC and all existing policy limits in the 32-case [fresh baseline](../architecture/baselines/2026-10-30-member-buffer-before.json) / [trial](../architecture/baselines/2026-10-30-member-buffer-trial.json). Timing and process-memory results did not show a consistent overall benefit.

An additional malformed-input probe exposed a concrete tradeoff: three actual bytes with matching local/central original-size fields forged to 32 MiB still returned `archive-read-invalid`, but the trial reserved the full advertised capacity before the final length rejection. Recorded ArrayBuffer allocation growth was **33,718,272 bytes**, versus **163,840 bytes** with the retained chunk reader: a 32 MiB difference. See the [rejection-path snapshots](../architecture/baselines/2026-10-30-member-buffer-rejection.json). These are fresh Node allocation-accounting snapshots, not a leak or exact RSS claim.

The trial was reverted. Decoded chunks remain bounded and retained according to actual output, with complete length/CRC validation before final file assembly. The 64 KiB stored windows, 1 KiB DEFLATE pushes, inflater, public diagnostics/APIs, transports and default writer are unchanged. Eight added integrity cases cover large independent members, empty files, shorter/longer forged lengths, actual aggregate overflow before copy and absence of an advertised-capacity allocation for short malformed payloads. Broader transient inflater allocation remains an investigation; no new decoder or output-preallocation policy is accepted.

### Selected private-Viewer change

The Viewer previously cloned every asset/attachment byte range into a fresh ArrayBuffer immediately before constructing its Blob. New private `assetBlob.ts` supplies an exact ordinary-buffer view directly to Blob construction, preserving byte offset and length. The [File API Blob-parts algorithm](https://w3c.github.io/FileAPI/#process-blob-parts) defines the immutable buffer-source snapshot. Shared or foreign-realm backing stores retain a preliminary copy into an ordinary local buffer.

This removes one explicit JavaScript byte clone for ordinary package assets. Blob snapshot storage, the eager file map, media decoding and GPU costs remain. Package bytes/signature coverage, MIME selection, allowed HTML resources and object-URL tracking/disposal stay unchanged. The converter's existing download Blob path is a separate implementation and is not changed by this increment. Eight helper/integration cases verify snapshot immutability, offset/pool/zero-length ranges, shared/foreign fallbacks, the ordinary-buffer fast path and the existing Viewer URL owner.

Reproduce the bounded helper experiment with the already-installed `tsx` development loader:

```sh
node --import tsx scripts/asset-blob-baseline.mjs --out examples/dist/asset-blob-baseline.json
```

The [Node native-Blob report](../architecture/baselines/2026-10-30-asset-blob.json) compares the former clone and actual new helper with eight offset views totaling 32 MiB. Fresh GC-enabled children run one warmup and five construction samples, followed by complete byte-hash checks outside timing. Explicit preliminary clone bytes fall from **33,554,432 to zero** for that ordinary-buffer fixture. Construction medians were **3.871 → 2.235 ms**; lifetime process peak RSS was about **267 → 255 MiB**, including source setup, `tsx` imports and Blob read-back verification. The [separate rerun](../architecture/baselines/2026-10-30-asset-blob-confirmation.json) retains all raw samples and matching helper/harness hashes.

Native allocation/GC snapshots vary: former-path ArrayBuffer changes ranged from 28–64 MiB, while the new path recorded 32 MiB for each sample in the initial run. Eliminating the explicit clone is a source-backed implementation fact; these Node figures do not establish a universal latency or peak-memory reduction, browser image/render/GPU behavior, or a change to the native snapshot requirement. Items 54/56 still require live browser acceptance and production/device traces. No public-package Changeset is required for this private-app change and reader-test-only additions.
