import type { Editor as TiptapEditor } from "@tiptap/core";
import { NumberFormat, VerticalAlignSection } from "docx";
import {
  PAGE_SIZES,
  type Orientation,
  type PageNumberFormatKey,
  type PageNumberPosition,
  type PageSizeKey,
  type PageVerticalAlign,
} from "./editorTypes";

export function getPageDimensions(pageSize: PageSizeKey, orientation: Orientation) {
  const page = PAGE_SIZES[pageSize];
  return orientation === "landscape"
    ? { width: page.height, height: page.width }
    : { width: page.width, height: page.height };
}

export function getDocumentOutline(editor: TiptapEditor, _version: number) {
  const items: { level: number; text: string; position: number }[] = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "heading") return true;
    const text = node.textContent.trim();
    if (!text) return true;
    items.push({
      level: Number(node.attrs.level || 1),
      text,
      position,
    });
    return true;
  });
  return items;
}

export function isPageNumberPosition(value: unknown): value is PageNumberPosition {
  return value === "top-left" ||
    value === "top-center" ||
    value === "top-right" ||
    value === "bottom-left" ||
    value === "bottom-center" ||
    value === "bottom-right";
}

export function isPageNumberFormat(value: unknown): value is PageNumberFormatKey {
  return value === "decimal" ||
    value === "lowerRoman" ||
    value === "upperRoman" ||
    value === "lowerLetter" ||
    value === "upperLetter";
}

export function isPageVerticalAlign(value: unknown): value is PageVerticalAlign {
  return value === "top" || value === "center" || value === "bottom" || value === "both";
}

export function pageVerticalAlignToDocx(value: PageVerticalAlign) {
  if (value === "center") return VerticalAlignSection.CENTER;
  if (value === "bottom") return VerticalAlignSection.BOTTOM;
  if (value === "both") return VerticalAlignSection.BOTH;
  return VerticalAlignSection.TOP;
}

export function pageNumberFormatToDocx(format: PageNumberFormatKey) {
  if (format === "lowerRoman") return NumberFormat.LOWER_ROMAN;
  if (format === "upperRoman") return NumberFormat.UPPER_ROMAN;
  if (format === "lowerLetter") return NumberFormat.LOWER_LETTER;
  if (format === "upperLetter") return NumberFormat.UPPER_LETTER;
  return NumberFormat.DECIMAL;
}

export function formatPageNumberPreview(value: number, format: PageNumberFormatKey) {
  const page = Math.max(1, Math.floor(value || 1));
  if (format === "lowerRoman") return toRoman(page).toLowerCase();
  if (format === "upperRoman") return toRoman(page);
  if (format === "lowerLetter") return toLetters(page).toLowerCase();
  if (format === "upperLetter") return toLetters(page);
  return String(page);
}

function toRoman(value: number) {
  const pairs: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let remaining = Math.min(value, 3999);
  let result = "";
  pairs.forEach(([amount, symbol]) => {
    while (remaining >= amount) {
      result += symbol;
      remaining -= amount;
    }
  });
  return result || "I";
}

function toLetters(value: number) {
  let current = Math.max(1, value);
  let result = "";
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}
