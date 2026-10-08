import { useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { countTextMatches, findNextMatch, replaceAllMatches } from "./editorSearch";
import type { EditorSaveStatus } from "./editorTypes";

type UseFindReplaceActionsOptions = {
  editor: Editor | null;
  plainText: string;
  findText: string;
  replaceText: string;
  setStatus: (status: EditorSaveStatus) => void;
};

export function useFindReplaceActions({
  editor,
  plainText,
  findText,
  replaceText,
  setStatus,
}: UseFindReplaceActionsOptions) {
  return useMemo(() => {
    const findMatches = countTextMatches(plainText, findText);

    const findNext = (replace = false) => {
      if (!editor) return;
      const changed = findNextMatch(editor, findText, replace ? replaceText : undefined);
      if (replace && changed) setStatus("dirty");
    };

    const replaceAll = () => {
      if (!editor) return;
      if (replaceAllMatches(editor, findText, replaceText)) setStatus("dirty");
    };

    return {
      findMatches,
      findNext,
      replaceAll,
    };
  }, [editor, findText, plainText, replaceText, setStatus]);
}
