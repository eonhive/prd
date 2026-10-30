/**
 * Company: EonHive Inc. | Title: Bounded DOCX Package Reader
 * Purpose: Resolve OPC content types and relationships within a validated archive snapshot.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { posix } from "node:path";
import { parseXml, xmlAttribute, xmlChildren, xmlText, type XmlBudget, type XmlElement } from "./xml.js";

export const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
export const WORD_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
const CORE_REL = "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
export type DocxWarn = (code: string, message: string, reference?: string) => void;
export interface DocxRelationship { type: string; path?: string; fragment?: string; external?: string }

export function resolveDocxTarget(from: string, target: string): { path: string; fragment: string } {
  if (/[\u0000-\u0020\u007f\\?]/u.test(target) || /^[a-z][a-z0-9+.-]*:/iu.test(target) || target.startsWith("//")) {
    throw new Error("DOCX internal relationships require safe package URI targets.");
  }
  const hash = target.indexOf("#");
  const path = decodeURIComponent(hash < 0 ? target : target.slice(0, hash));
  const fragment = hash < 0 ? "" : decodeURIComponent(target.slice(hash + 1));
  if (/[\u0000-\u001f\u007f\\:#?]/u.test(path) || path.startsWith("//") || /[\u0000-\u001f\u007f]/u.test(fragment)) throw new Error("DOCX relationship contains an unsafe encoded target.");
  if (!path) {
    if (!from) throw new Error("DOCX relationship has no part target.");
    return { path: from, fragment };
  }
  const segments = path.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const segment of path.replace(/^\//u, "").split("/")) {
    if (segment === "..") {
      if (!segments.length) throw new Error("DOCX relationship escapes the package root.");
      segments.pop();
    } else if (segment !== ".") {
      if (!segment) throw new Error("DOCX relationship has an empty path segment.");
      segments.push(segment);
    }
  }
  if (!segments.length) throw new Error("DOCX relationship has no part target.");
  return { path: segments.join("/"), fragment };
}

export class DocxPackage {
  readonly used = new Set(["[Content_Types].xml", "_rels/.rels"]);
  readonly budget: XmlBudget;
  private readonly defaults = new Map<string, string>();
  private readonly overrides = new Map<string, string>();
  private rootRelationships = new Map<string, DocxRelationship>();
  relationships = new Map<string, DocxRelationship>();
  mainPath = "";

  constructor(readonly files: Record<string, Uint8Array>, maxNodes: number) {
    // Word's shared style definitions need parsing work beyond the emitted body-node budget.
    this.budget = { remaining: Math.min(maxNodes * 2, Number.MAX_SAFE_INTEGER) };
  }

  async xml(path: string, name: string, namespace: string): Promise<XmlElement> {
    const bytes = this.files[path];
    if (!bytes) throw new Error(`DOCX is missing required part ${path}.`);
    const root = await parseXml(bytes, this.budget, "DOCX");
    if (root.name !== name || root.namespace !== namespace) throw new Error(`DOCX requires a namespace-correct ${name} root.`);
    this.used.add(path);
    return root;
  }

  contentType(path: string): string | undefined {
    return this.overrides.get(path) ?? this.defaults.get(posix.extname(path).slice(1).toLowerCase());
  }

  private async readContentTypes(): Promise<void> {
    const root = await this.xml("[Content_Types].xml", "Types", TYPES_NS);
    for (const item of xmlChildren(root, "Default")) {
      const extension = xmlAttribute(item, "Extension")?.toLowerCase();
      const type = xmlAttribute(item, "ContentType");
      if (!extension || !/^[a-z0-9]+$/u.test(extension) || !type || this.defaults.has(extension)) throw new Error("DOCX has invalid or duplicate default content types.");
      this.defaults.set(extension, type);
    }
    for (const item of xmlChildren(root, "Override")) {
      const name = xmlAttribute(item, "PartName");
      const type = xmlAttribute(item, "ContentType");
      if (!name?.startsWith("/") || !type) throw new Error("DOCX content type overrides require a package part name and type.");
      const target = resolveDocxTarget("", name);
      if (target.fragment || this.overrides.has(target.path)) throw new Error("DOCX has duplicate or fragmented content type overrides.");
      this.overrides.set(target.path, type);
    }
    if ([...this.defaults.values(), ...this.overrides.values()].some((type) => /macroEnabled|vbaProject/iu.test(type)) ||
      Object.keys(this.files).some((path) => /(?:^|\/)vbaProject\.bin$/iu.test(path))) throw new Error("Macro-enabled Word packages are outside the supported DOCX subset.");
  }

  private async readRelationships(part: string, required = false): Promise<Map<string, DocxRelationship>> {
    const path = part ? posix.join(posix.dirname(part), "_rels", `${posix.basename(part)}.rels`) : "_rels/.rels";
    if (!this.files[path] && !required) return new Map();
    const root = await this.xml(path, "Relationships", PACKAGE_REL_NS);
    const relationships = new Map<string, DocxRelationship>();
    for (const element of xmlChildren(root, "Relationship")) {
      const id = xmlAttribute(element, "Id");
      const type = xmlAttribute(element, "Type");
      const target = xmlAttribute(element, "Target");
      const mode = xmlAttribute(element, "TargetMode");
      if (!id || !type || !target || relationships.has(id) || (mode && !["Internal", "External"].includes(mode))) throw new Error("DOCX has an invalid or duplicate relationship.");
      const relation: DocxRelationship = mode === "External" ? { type, external: target } : { type, ...resolveDocxTarget(part, target) };
      if (relation.fragment && type !== `${REL_NS}/hyperlink`) throw new Error("DOCX non-hyperlink relationships must not contain fragments.");
      relationships.set(id, relation);
    }
    return relationships;
  }

  private uniqueRelationship(relationships: Map<string, DocxRelationship>, type: string): DocxRelationship | undefined {
    const matches = [...relationships.values()].filter((item) => item.type === type);
    if (matches.length > 1) throw new Error("DOCX has ambiguous part relationships.");
    return matches[0];
  }

  related(suffix: string, expectedType: string): string | undefined {
    const relation = this.uniqueRelationship(this.relationships, `${REL_NS}/${suffix}`);
    if (!relation) return undefined;
    if (!relation.path || !this.files[relation.path] || this.contentType(relation.path) !== expectedType) throw new Error(`DOCX ${suffix} relationship must identify a local part with its expected content type.`);
    return relation.path;
  }

  async title(): Promise<string | undefined> {
    const relation = this.uniqueRelationship(this.rootRelationships, CORE_REL);
    if (!relation) return undefined;
    if (!relation.path || this.contentType(relation.path) !== "application/vnd.openxmlformats-package.core-properties+xml") throw new Error("DOCX core properties must be a local declared part.");
    const root = await this.xml(relation.path, "coreProperties", "http://schemas.openxmlformats.org/package/2006/metadata/core-properties");
    return xmlChildren(root, "title", "http://purl.org/dc/elements/1.1/").map(xmlText).find(Boolean);
  }

  async open(): Promise<XmlElement> {
    await this.readContentTypes();
    this.rootRelationships = await this.readRelationships("", true);
    const main = this.uniqueRelationship(this.rootRelationships, `${REL_NS}/officeDocument`);
    if (!main?.path || this.contentType(main.path) !== WORD_TYPE) throw new Error("DOCX requires one local transitional Word document relationship and content type.");
    this.mainPath = main.path;
    this.relationships = await this.readRelationships(main.path);
    return this.xml(main.path, "document", WORD_NS);
  }
}
