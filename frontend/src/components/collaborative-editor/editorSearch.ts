import type { Editor as TiptapEditor } from "@tiptap/core";

type TextRange = { from: number; to: number };

export function findNextMatch(editor: TiptapEditor, findText: string, replaceText?: string) {
  if (!findText.trim()) return false;
  const needle = findText.toLocaleLowerCase();
  const selectionTo = editor.state.selection.to;
  const ranges: TextRange[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const haystack = node.text.toLocaleLowerCase();
    let index = haystack.indexOf(needle);
    while (index >= 0) {
      ranges.push({ from: pos + index, to: pos + index + findText.length });
      index = haystack.indexOf(needle, index + needle.length);
    }
    return true;
  });

  const target = ranges.find((range) => range.from >= selectionTo) || ranges[0];
  if (!target) return false;
  if (replaceText !== undefined) {
    editor.view.dispatch(editor.state.tr.insertText(replaceText, target.from, target.to));
    editor.commands.focus();
    return true;
  }
  editor.chain().focus().setTextSelection(target).run();
  return true;
}

export function replaceAllMatches(editor: TiptapEditor, findText: string, replaceText: string) {
  if (!findText.trim()) return false;
  const needle = findText.toLocaleLowerCase();
  const ranges: { from: number; to: number }[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const haystack = node.text.toLocaleLowerCase();
    let index = haystack.indexOf(needle);
    while (index >= 0) {
      ranges.push({ from: pos + index, to: pos + index + findText.length });
      index = haystack.indexOf(needle, index + needle.length);
    }
    return true;
  });

  if (!ranges.length) return false;
  const transaction = editor.state.tr;
  [...ranges].reverse().forEach((range) => {
    transaction.insertText(replaceText, range.from, range.to);
  });
  editor.view.dispatch(transaction);
  editor.commands.focus();
  return true;
}

export function countTextMatches(text: string, findText: string) {
  if (!findText.trim()) return 0;
  const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(text.matchAll(new RegExp(escaped, "gi"))).length;
}
