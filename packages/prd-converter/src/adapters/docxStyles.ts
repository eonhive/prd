/**
 * Company: EonHive Inc. | Title: DOCX Paragraph Structure
 * Purpose: Resolve bounded paragraph style inheritance and simple list definitions.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { DocxPackage, WORD_NS, type DocxWarn } from "./docxPackage.js";
import { xmlAttribute, xmlChildren, type XmlElement } from "./xml.js";

export const wordChild = (element: XmlElement | undefined, name: string): XmlElement | undefined =>
  element ? xmlChildren(element, name, WORD_NS)[0] : undefined;
export const wordValue = (element: XmlElement | undefined): string | undefined => xmlAttribute(element, "val", WORD_NS);
export function enabled(element: XmlElement | undefined): boolean {
  return element !== undefined && !["0", "false", "off"].includes(wordValue(element) ?? "1");
}

interface ParagraphProperties { outline?: string; numId?: string; level?: string; title?: boolean }
interface Style { parent?: string; properties: ParagraphProperties }
export interface SimpleList { key: string; style: "ordered" | "unordered" }

function paragraphProperties(properties: XmlElement | undefined): ParagraphProperties {
  const result: ParagraphProperties = {};
  const outline = wordValue(wordChild(properties, "outlineLvl"));
  const numbering = wordChild(properties, "numPr");
  const numId = wordValue(wordChild(numbering, "numId"));
  const level = wordValue(wordChild(numbering, "ilvl"));
  if (outline !== undefined) result.outline = outline;
  if (numId !== undefined) result.numId = numId;
  if (level !== undefined) result.level = level;
  return result;
}

export class DocxStyles {
  private readonly styles = new Map<string, Style>();
  private readonly resolved = new Map<string, ParagraphProperties>();
  private readonly lists = new Map<string, SimpleList | undefined>();
  private defaultStyle?: string;

  constructor(private readonly warn: DocxWarn) {}

  async load(pkg: DocxPackage): Promise<void> {
    const stylesPath = pkg.related("styles", "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml");
    if (stylesPath) {
      const root = await pkg.xml(stylesPath, "styles", WORD_NS);
      for (const element of xmlChildren(root, "style")) {
        const id = xmlAttribute(element, "styleId", WORD_NS);
        if (!id || this.styles.has(id)) throw new Error("DOCX has invalid or duplicate style IDs.");
        const properties = paragraphProperties(wordChild(element, "pPr"));
        if (id === "Title" || wordValue(wordChild(element, "name"))?.toLowerCase() === "title") properties.title = true;
        this.styles.set(id, { parent: wordValue(wordChild(element, "basedOn")), properties });
        if (xmlAttribute(element, "type", WORD_NS) === "paragraph" && enabledAttribute(element, "default")) {
          if (this.defaultStyle) throw new Error("DOCX has multiple default paragraph styles.");
          this.defaultStyle = id;
        }
      }
    }
    const numberingPath = pkg.related("numbering", "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml");
    if (numberingPath) this.readNumbering(await pkg.xml(numberingPath, "numbering", WORD_NS));
  }

  private readNumbering(root: XmlElement): void {
    const abstracts = new Map<string, XmlElement>();
    for (const element of xmlChildren(root, "abstractNum")) {
      const id = xmlAttribute(element, "abstractNumId", WORD_NS);
      if (!id || abstracts.has(id)) throw new Error("DOCX has invalid or duplicate abstract numbering IDs.");
      abstracts.set(id, element);
    }
    for (const element of xmlChildren(root, "num")) {
      const id = xmlAttribute(element, "numId", WORD_NS);
      if (!id || this.lists.has(id)) throw new Error("DOCX has invalid or duplicate numbering IDs.");
      const abstract = abstracts.get(wordValue(wordChild(element, "abstractNumId")) ?? "");
      const levels = abstract ? xmlChildren(abstract, "lvl").filter((level) => xmlAttribute(level, "ilvl", WORD_NS) === "0") : [];
      const level = levels.length === 1 ? levels[0] : undefined;
      const format = wordValue(wordChild(level, "numFmt"));
      const pattern = wordValue(wordChild(level, "lvlText"));
      const start = wordValue(wordChild(level, "start")) ?? "1";
      const simple = !wordChild(element, "lvlOverride") && (format === "bullet" ||
        (format === "decimal" && start === "1" && pattern === "%1."));
      this.lists.set(id, simple ? { key: id, style: format === "bullet" ? "unordered" : "ordered" } : undefined);
    }
  }

  private style(id: string, parents: string[] = []): ParagraphProperties {
    const cached = this.resolved.get(id);
    if (cached) return cached;
    if (parents.includes(id) || parents.length >= 64) throw new Error("DOCX style inheritance is cyclic or exceeds the depth limit.");
    const style = this.styles.get(id);
    if (!style) {
      this.warn("docx-style-unresolved", "An unknown paragraph style is not interpreted; readable text is retained.");
      return {};
    }
    const properties = { ...(style.parent ? this.style(style.parent, [...parents, id]) : {}), ...style.properties };
    this.resolved.set(id, properties);
    return properties;
  }

  properties(paragraph: XmlElement): ParagraphProperties {
    const direct = wordChild(paragraph, "pPr");
    const id = wordValue(wordChild(direct, "pStyle")) ?? this.defaultStyle;
    return { ...(id ? this.style(id) : {}), ...paragraphProperties(direct) };
  }

  list(properties: ParagraphProperties): SimpleList | undefined {
    if (!properties.numId || properties.numId === "0") return undefined;
    const list = this.lists.get(properties.numId);
    if (properties.level && properties.level !== "0" || !list) {
      this.warn("docx-list-flattened", "Nested, unresolved or customized numbering becomes ordinary paragraph text; original numbering remains only in the retained source.");
      return undefined;
    }
    return list;
  }
}

function enabledAttribute(element: XmlElement, name: string): boolean {
  return ["1", "true", "on"].includes(xmlAttribute(element, name, WORD_NS) ?? "");
}
