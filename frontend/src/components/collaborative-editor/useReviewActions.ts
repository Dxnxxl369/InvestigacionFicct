import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { Editor } from "@tiptap/core";
import { escapeHtml } from "./documentModel";
import { applySuggestionDecision } from "./reviewUtils";
import type { EditorSaveStatus, ReviewComment, SuggestionItem } from "./editorTypes";

type UseReviewActionsOptions = {
  editor: Editor | null;
  currentUserName?: string;
  commentDraft: string;
  suggestionDraft: string;
  suggestions: SuggestionItem[];
  setCommentDraft: Dispatch<SetStateAction<string>>;
  setSuggestionDraft: Dispatch<SetStateAction<string>>;
  setComments: Dispatch<SetStateAction<ReviewComment[]>>;
  setSuggestions: Dispatch<SetStateAction<SuggestionItem[]>>;
  setStatus: (status: EditorSaveStatus) => void;
};

export function useReviewActions({
  editor,
  currentUserName,
  commentDraft,
  suggestionDraft,
  suggestions,
  setCommentDraft,
  setSuggestionDraft,
  setComments,
  setSuggestions,
  setStatus,
}: UseReviewActionsOptions) {
  return useMemo(() => {
    const addComment = () => {
      if (!editor || !commentDraft.trim()) return;
      const id = `c-${Date.now()}`;
      const text = commentDraft.trim();
      const nextComment: ReviewComment = {
        id,
        text,
        author: currentUserName || "Usuario",
        createdAt: new Date().toISOString(),
      };
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent(`<span data-comment-id="${id}">${escapeHtml(text)}</span>`).run();
      } else {
        editor.chain().focus().setMark("commentMark", { id }).run();
      }
      setComments((value) => [...value, nextComment]);
      setCommentDraft("");
      setStatus("dirty");
    };

    const toggleCommentResolved = (id: string) => {
      setComments((value) => value.map((comment) => comment.id === id ? { ...comment, resolved: !comment.resolved } : comment));
      setStatus("dirty");
    };

    const removeComment = (id: string) => {
      setComments((value) => value.filter((comment) => comment.id !== id));
      setStatus("dirty");
    };

    const addInsertionSuggestion = () => {
      if (!editor || !suggestionDraft.trim()) return;
      const id = `s-${Date.now()}`;
      const text = suggestionDraft.trim();
      editor.chain().focus().insertContent(`<span data-suggestion-id="${id}" data-suggestion-kind="insert">${escapeHtml(text)}</span>`).run();
      setSuggestions((value) => [...value, {
        id,
        type: "insert",
        text,
        author: currentUserName || "Usuario",
        createdAt: new Date().toISOString(),
        status: "pending",
      }]);
      setSuggestionDraft("");
      setStatus("dirty");
    };

    const addDeletionSuggestion = () => {
      if (!editor || editor.state.selection.empty) return;
      const id = `s-${Date.now()}`;
      const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
      editor.chain().focus().setMark("suggestionMark", { id, kind: "delete" }).run();
      setSuggestions((value) => [...value, {
        id,
        type: "delete",
        text,
        author: currentUserName || "Usuario",
        createdAt: new Date().toISOString(),
        status: "pending",
      }]);
      setStatus("dirty");
    };

    const updateSuggestionStatus = (id: string, status: "accepted" | "rejected") => {
      if (editor) {
        const suggestion = suggestions.find((item) => item.id === id);
        applySuggestionDecision(editor, id, suggestion?.type, status);
      }
      setSuggestions((value) => value.map((suggestion) => suggestion.id === id ? { ...suggestion, status } : suggestion));
      setStatus("dirty");
    };

    const updateAllPendingSuggestions = (status: "accepted" | "rejected") => {
      const pendingSuggestions = suggestions.filter((suggestion) => suggestion.status === "pending");
      if (!pendingSuggestions.length) return;
      if (editor) {
        pendingSuggestions.forEach((suggestion) => {
          applySuggestionDecision(editor, suggestion.id, suggestion.type, status);
        });
      }
      const pendingIds = new Set(pendingSuggestions.map((suggestion) => suggestion.id));
      setSuggestions((value) => value.map((suggestion) => (
        pendingIds.has(suggestion.id) ? { ...suggestion, status } : suggestion
      )));
      setStatus("dirty");
    };

    return {
      addComment,
      toggleCommentResolved,
      removeComment,
      addInsertionSuggestion,
      addDeletionSuggestion,
      updateSuggestionStatus,
      updateAllPendingSuggestions,
    };
  }, [
    commentDraft,
    currentUserName,
    editor,
    setCommentDraft,
    setComments,
    setStatus,
    setSuggestionDraft,
    setSuggestions,
    suggestionDraft,
    suggestions,
  ]);
}
