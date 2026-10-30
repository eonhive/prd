/**
 * Company: EonHive Inc. | Title: EPUB Import Adapter
 * Purpose: Reconstruct bounded reflowable EPUB spine chapters using existing HTML semantics.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type { PrdGeneralDocumentInlineSectionNode, PrdGeneralDocumentLinksNode } from "@eonhive/prd-types";
import { extname } from "node:path";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import type { ConversionWarning, ImportAdapter, ImportContext, ImportResult } from "../contracts.js";
import { HtmlExtractor } from "./html.js";
import { parseEpubXml, xhtmlTree, xmlChildren, xmlText, type XmlBudget, type XmlElement } from "./epubXml.js";

const CONTAINER_NS = "urn:oasis:names:tc:opendocument:xmlns:container";
const OPF_NS = "http://www.idpf.org/2007/opf";
const XHTML_NS = "http://www.w3.org/1999/xhtml";
const DC_NS = "http://purl.org/dc/elements/1.1/";
const XHTML_TYPE = "application/xhtml+xml";
const RASTER_TYPES = new Map([
  [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".gif", "image/gif"], [".webp", "image/webp"]
]);

interface Item { path?: string; type: string }
interface PendingLink {
  node: PrdGeneralDocumentLinksNode;
  owner: PrdGeneralDocumentInlineSectionNode;
  path: string;
  fragment: string;
}

function requiredAttribute(element: XmlElement, name: string): string {
  const value = element.attributes[name];
  if (!value?.trim()) throw new Error(`EPUB ${element.name} requires ${name}.`);
  return value;
}

function singleChild(element: XmlElement, name: string): XmlElement {
  const children = xmlChildren(element, name);
  if (children.length !== 1) throw new Error(`EPUB ${element.name} requires exactly one ${name}.`);
  return children[0]!;
}

function requireRoot(root: XmlElement, name: string, namespace: string): void {
  if (root.name !== name || root.namespace !== namespace) throw new Error(`EPUB requires a namespace-correct ${name} root.`);
}

function archiveReference(from: string, reference: string): { path: string; fragment: string } {
  if (/[\u0000-\u0020\u007f\\?]/u.test(reference) || /^[a-z][a-z0-9+.-]*:/iu.test(reference) || reference.startsWith("/")) {
    throw new Error("EPUB references must be local archive paths without queries, schemes or backslashes.");
  }
  const hash = reference.indexOf("#");
  const rawPath = hash < 0 ? reference : reference.slice(0, hash);
  const path = decodeURIComponent(rawPath);
  const fragment = hash < 0 ? "" : decodeURIComponent(reference.slice(hash + 1));
  if (/[\u0000-\u001f\u007f\\:#?]/u.test(path) || path.startsWith("/") || /[\u0000-\u001f\u007f]/u.test(fragment)) {
    throw new Error("EPUB reference contains an unsafe encoded path or fragment.");
  }
  if (!path) return { path: from, fragment };
  const segments = from.split("/").slice(0, -1);
  for (const segment of path.split("/")) {
    if (segment === "..") {
      if (!segments.length) throw new Error("EPUB reference escapes the archive root.");
      segments.pop();
    } else if (segment !== ".") {
      if (!segment) throw new Error("EPUB reference contains an empty path segment.");
      segments.push(segment);
    }
  }
  if (!segments.length) throw new Error("EPUB reference has no file path.");
  return { path: segments.join("/"), fragment };
}

class EpubBook {
  private readonly budget: XmlBudget;
  private readonly warnings: ConversionWarning[] = [];
  private readonly byId = new Map<string, Item>();
  private readonly byPath = new Map<string, Item>();
  private readonly chapters = new Map<string, { id: string; anchors: Map<string, string> }>();
  private readonly pending: PendingLink[] = [];
  private readonly used = new Set(["mimetype", "META-INF/container.xml"]);
  private outputNodes = 0;

  constructor(private readonly files: Record<string, Uint8Array>, private readonly context: ImportContext) {
    this.budget = { remaining: context.limits.maxNodes };
  }

  private warn(code: string, message: string, reference?: string): void {
    this.warnings.push({ code, stage: "extract", message, ...(reference ? { reference } : {}) });
  }

  private member(path: string): Uint8Array {
    const bytes = this.files[path];
    if (!bytes) throw new Error(`EPUB is missing required member ${path}.`);
    return bytes;
  }

  private async readPackage(): Promise<{ opf: XmlElement; path: string }> {
    if (!Buffer.from(this.member("mimetype")).equals(Buffer.from("application/epub+zip"))) {
      throw new Error("EPUB mimetype must be application/epub+zip.");
    }
    if (this.files["META-INF/encryption.xml"]) throw new Error("Encrypted or obfuscated EPUB resources are unsupported; no decryption is performed.");
    const container = await parseEpubXml(this.member("META-INF/container.xml"), this.budget);
    requireRoot(container, "container", CONTAINER_NS);
    const roots = xmlChildren(singleChild(container, "rootfiles"), "rootfile");
    if (!roots.length) throw new Error("EPUB container has no rootfile.");
    if (roots.length > 1) this.warn("epub-alternate-renditions", "Only the first package rendition is imported; alternatives remain in the retained source.");
    const root = roots[0]!;
    if (root.attributes["media-type"] !== "application/oebps-package+xml") throw new Error("EPUB rootfile must identify an OPF package.");
    const reference = archiveReference("", requiredAttribute(root, "full-path"));
    if (reference.fragment) throw new Error("EPUB rootfile must not contain a fragment.");
    const opf = await parseEpubXml(this.member(reference.path), this.budget);
    requireRoot(opf, "package", OPF_NS);
    if (!["2.0", "3.0"].includes(opf.attributes.version ?? "")) throw new Error("Only EPUB package versions 2.0 and 3.0 are supported.");
    this.used.add(reference.path);
    return { opf, path: reference.path };
  }

  private readManifest(opf: XmlElement, packagePath: string): void {
    for (const element of xmlChildren(singleChild(opf, "manifest"), "item")) {
      const id = requiredAttribute(element, "id");
      if (this.byId.has(id)) throw new Error("EPUB manifest contains a duplicate item ID.");
      const href = requiredAttribute(element, "href");
      const item: Item = { type: requiredAttribute(element, "media-type") };
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(href)) {
        this.warn("epub-remote-resource", "A remote manifest resource is not fetched or imported.", id);
      } else {
        const resolved = archiveReference(packagePath, href);
        if (resolved.fragment) throw new Error("EPUB manifest resource paths must not contain fragments.");
        if (this.byPath.has(resolved.path)) throw new Error("EPUB manifest contains duplicate resource paths.");
        item.path = resolved.path;
        this.byPath.set(resolved.path, item);
      }
      this.byId.set(id, item);
    }
  }

  private async image(from: string, reference: string): Promise<{ id: string } | undefined> {
    try {
      const target = archiveReference(from, reference);
      const declared = this.byPath.get(target.path);
      if (target.fragment || !declared || RASTER_TYPES.get(extname(target.path).toLowerCase()) !== declared.type || !this.files[target.path]) {
        throw new Error("Image must be a local declared raster member without a fragment.");
      }
      const resource = await this.context.collectImage!(target.path, this.files[target.path]!);
      if (resource) this.used.add(target.path);
      return resource;
    } catch {
      this.warn("epub-image-omitted", "An image has an unsafe, missing, undeclared or unsupported archive reference; any alternative text is retained.", from);
      return undefined;
    }
  }

  private localLink(owner: PrdGeneralDocumentInlineSectionNode, from: string, href: string, label: string) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(href)) return undefined;
    try {
      const target = archiveReference(from, href);
      const node: PrdGeneralDocumentLinksNode = { type: "links", style: "inline", items: [{ label, href: "#pending" }] };
      this.pending.push({ node, owner, ...target });
      return node;
    } catch {
      this.warn("epub-link-omitted", "An unsafe local link becomes plain text.", from);
      return { type: "paragraph" as const, text: label };
    }
  }

  private async readChapter(itemref: XmlElement, index: number): Promise<PrdGeneralDocumentInlineSectionNode> {
    if (itemref.attributes.properties?.split(/\s+/u).some((token) => token.endsWith("layout-pre-paginated"))) throw new Error("Fixed-layout EPUB spine items are unsupported.");
    const item = this.byId.get(requiredAttribute(itemref, "idref"));
    if (!item?.path || item.type !== XHTML_TYPE) throw new Error("Every EPUB spine item must resolve to a local declared XHTML resource.");
    const path = item.path;
    if (this.chapters.has(path)) throw new Error("Repeated EPUB spine resources are unsupported.");
    if (itemref.attributes.linear === "no") this.warn("epub-nonlinear-content", "A non-linear spine item is retained at its listed position as an ordinary chapter.", path);
    const xml = await parseEpubXml(this.member(path), this.budget);
    requireRoot(xml, "html", XHTML_NS);
    this.used.add(path);
    const id = `epub-chapter-${index + 1}`;
    const section: PrdGeneralDocumentInlineSectionNode = { type: "section", id, title: "", children: [] };
    const extracted = new HtmlExtractor({
      ...this.context,
      resolveImage: (reference) => this.image(path, reference)
    }, (href, label) => this.localLink(section, path, href, label));
    await extracted.extract(xhtmlTree(xml));
    section.title = extracted.title ?? `Chapter ${index + 1}`;
    section.children = extracted.nodes;
    if (!section.children.length) throw new Error(`EPUB spine chapter has no supported readable content: ${path}.`);
    const ids = new Map<string, string>();
    const first = section.children[0]!;
    // The canonical section already renders its title; preserve a matching heading's anchor there.
    if (section.children.length > 1 && first.type === "heading" && first.text === section.title) {
      if (first.id) ids.set(first.id, id);
      section.children.shift();
      this.warn("epub-heading-normalized", "A matching opening heading becomes the chapter section title; its source anchor is retained.", path);
    }
    this.outputNodes += section.children.length + 1;
    if (this.outputNodes > this.context.limits.maxNodes) throw new Error("EPUB content node count exceeds the conversion limit.");
    // Chapter-local HTML anchors must become unique before resolving links across the book.
    section.children.forEach((node, nodeIndex) => {
      const nodeId = `${id}-node-${nodeIndex + 1}`;
      if (node.id) ids.set(node.id, nodeId);
      node.id = nodeId;
    });
    this.chapters.set(path, { id, anchors: new Map([...extracted.targets].map(([source, target]) => [source, ids.get(target)!])) });
    this.warnings.push(...extracted.warnings.map((warning) => ({ ...warning, reference: warning.reference ? `${path}:${warning.reference}` : path })));
    return section;
  }

  private resolveLinks(): void {
    for (const link of this.pending) {
      const chapter = this.chapters.get(link.path);
      const target = link.fragment ? chapter?.anchors.get(link.fragment) : chapter?.id;
      if (target) link.node.items[0]!.href = `#${target}`;
      else {
        const index = link.owner.children.indexOf(link.node);
        link.owner.children[index] = { type: "paragraph", id: link.node.id, text: link.node.items[0]!.label };
        this.warn("epub-link-omitted", "A local link has no retained chapter or anchor; its label remains plain text.", link.path);
      }
    }
  }

  async import(): Promise<ImportResult> {
    const { opf, path } = await this.readPackage();
    const metadata = singleChild(opf, "metadata");
    if (xmlChildren(metadata, "meta").some((item) => (item.attributes.property?.endsWith(":layout") && xmlText(item) === "pre-paginated") ||
      (item.attributes.name === "fixed-layout" && item.attributes.content === "true"))) {
      throw new Error("Fixed-layout EPUB conversion is unsupported.");
    }
    const title = xmlChildren(metadata, "title", DC_NS).map(xmlText).find(Boolean);
    this.readManifest(opf, path);
    const spine = singleChild(opf, "spine");
    const itemrefs = xmlChildren(spine, "itemref");
    if (!itemrefs.length) throw new Error("EPUB spine is empty.");
    this.warn("epub-subset", "Spine XHTML becomes responsive chapter sections. CSS, typography, metadata beyond title, navigation/NCX hierarchies, media overlays and page layout are not mapped. Original material is available only when source retention is enabled.");
    if (spine.attributes["page-progression-direction"]) this.warn("epub-reading-direction", "Page progression is not mapped; verify reading direction in the responsive result.");
    const sections: PrdGeneralDocumentInlineSectionNode[] = [];
    for (const [index, itemref] of itemrefs.entries()) sections.push(await this.readChapter(itemref, index));
    this.resolveLinks();
    const omitted = Object.keys(this.files).filter((member) => !this.used.has(member)).length;
    if (omitted) this.warn("epub-members-omitted", `${omitted} archive members are not mapped into the reading view, including navigation, styles, metadata or unused resources. They remain available only with source retention.`);
    return { title, content: { profile: "general-document", children: sections }, warnings: this.warnings };
  }
}

export const epubAdapter: ImportAdapter = {
  id: "epub",
  async detect(source) {
    return /\.epub$/iu.test(source.name) && source.bytes[0] === 0x50 && source.bytes[1] === 0x4b && source.bytes[2] === 3 && source.bytes[3] === 4;
  },
  async import(source, context) {
    if (!context.collectImage) throw new Error("EPUB import requires bounded archive-image collection.");
    const limits = context.limits;
    const files = readPrdArchive(source.bytes, {
      maxArchiveBytes: limits.maxInputBytes, maxFileBytes: limits.maxResourceBytes,
      maxExpandedBytes: limits.maxTotalResourceBytes, maxEntries: limits.maxResources
    });
    return new EpubBook(files, context).import();
  }
};
