import type { Editor as TiptapEditor } from "@tiptap/core";
import type { SuggestionItem } from "./editorTypes";

export function applySuggestionDecision(
  editor: TiptapEditor,
  suggestionId: string,
  suggestionType: SuggestionItem["type"] | undefined,
  decision: "accepted" | "rejected"
) {
  const markType = editor.schema.marks.suggestionMark;
  if (!markType) return;
  const ranges: { from: number; to: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    const hasMark = node.marks?.some((mark) => mark.type === markType && mark.attrs.id === suggestionId);
    if (hasMark) ranges.push({ from: pos, to: pos + node.nodeSize });
    return true;
  });
  if (!ranges.length) return;

  const shouldDelete =
    (suggestionType === "insert" && decision === "rejected") ||
    (suggestionType === "delete" && decision === "accepted");
  const transaction = editor.state.tr;

  if (shouldDelete) {
    [...ranges].reverse().forEach((range) => transaction.delete(range.from, range.to));
  } else {
    ranges.forEach((range) => transaction.removeMark(range.from, range.to, markType));
  }

  editor.view.dispatch(transaction);
}
