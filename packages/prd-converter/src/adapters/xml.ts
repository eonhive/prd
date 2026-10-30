/**
 * Company: EonHive Inc. | Title: Bounded Conversion XML Reader
 * Purpose: Share namespace-aware, budgeted XML parsing without external entity resolution.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
export interface XmlElement {
  name: string;
  namespace: string;
  attributes: Record<string, string>;
  children: Array<XmlElement | string>;
  attributeDetails: Array<{ local: string; namespace: string; value: string }>;
}

export interface XmlBudget { remaining: number }

export async function parseXml(bytes: Uint8Array, budget: XmlBudget, format: string): Promise<XmlElement> {
  let saxes: typeof import("saxes");
  try {
    saxes = await import("saxes");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(`${format} conversion requires the optional saxes dependency. Install saxes@^6.0.0 in the converter's environment.`);
    }
    throw error;
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const parser = new saxes.SaxesParser({ xmlns: true });
  const stack: XmlElement[] = [];
  let root: XmlElement | undefined;
  function consume(): void {
    if (--budget.remaining < 0) throw new Error(`${format} XML work exceeds the conversion node budget.`);
  }
  parser.on("error", (error) => { throw error; });
  parser.on("doctype", () => { throw new Error(`${format} XML DTDs and entity declarations are unsupported.`); });
  parser.on("processinginstruction", () => { throw new Error(`${format} XML processing instructions are unsupported.`); });
  parser.on("xmldecl", (declaration) => {
    if (declaration.version !== "1.0" || (declaration.encoding && !/^utf-?8$/iu.test(declaration.encoding))) {
      throw new Error(`${format} XML must declare XML 1.0 and UTF-8 when an encoding is specified.`);
    }
  });
  parser.on("opentagstart", consume);
  parser.on("attribute", consume);
  parser.on("comment", consume);
  parser.on("opentag", (tag) => {
    if (stack.length >= 64) throw new Error(`${format} XML nesting exceeds the conversion limit.`);
    const attributes: Record<string, string> = Object.create(null);
    for (const attribute of Object.values(tag.attributes)) {
      if (attribute.uri === "http://www.w3.org/XML/1998/namespace" && attribute.local === "base") {
        throw new Error(`${format} xml:base references are unsupported.`);
      }
      attributes[attribute.name] = attribute.value;
    }
    const element: XmlElement = { name: tag.local, namespace: tag.uri, attributes, children: [], attributeDetails: Object.values(tag.attributes).map((attribute) => ({ local: attribute.local, namespace: attribute.uri, value: attribute.value })) };
    if (stack.length) stack.at(-1)!.children.push(element);
    else root = element;
    stack.push(element);
  });
  parser.on("closetag", () => { stack.pop(); });
  function appendText(value: string): void {
    consume();
    stack.at(-1)?.children.push(value);
  }
  parser.on("text", appendText);
  parser.on("cdata", appendText);
  parser.write(text).close();
  if (!root) throw new Error(`${format} XML has no root element.`);
  return root;
}

export function xmlChildren(element: XmlElement, name: string, namespace = element.namespace): XmlElement[] {
  return element.children.filter((child): child is XmlElement =>
    typeof child !== "string" && child.name === name && child.namespace === namespace);
}

export function xmlText(element: XmlElement): string {
  return element.children.map((child) => typeof child === "string" ? child : xmlText(child)).join("").replace(/\s+/gu, " ").trim();
}

export function xmlAttribute(element: XmlElement | undefined, name: string, namespace = ""): string | undefined {
  return element?.attributeDetails.find((attribute) => attribute.local === name && attribute.namespace === namespace)?.value;
}
