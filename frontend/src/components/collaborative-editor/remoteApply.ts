import type { MutableRefObject } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { Step } from "@tiptap/pm/transform";
import {
  applyDocumentSettings,
  type DocumentSettingsSetters,
} from "./documentModel";
import type { RemoteSnapshot, RemoteSteps } from "./useDocumentRealtime";

type ApplyRemoteSnapshotParams = {
  editor: TiptapEditor | null;
  snapshot: RemoteSnapshot;
  settingsSetters: DocumentSettingsSetters;
  settingsKey: string;
  storageKey: string;
  remoteApplyingRef: MutableRefObject<boolean>;
  suppressNextSettingsEffectRef: MutableRefObject<boolean>;
};

type ApplyRemoteStepsParams = {
  editor: TiptapEditor | null;
  payload: RemoteSteps;
  storageKey: string;
  remoteApplyingRef: MutableRefObject<boolean>;
};

export function applyRemoteSnapshotToEditor({
  editor,
  snapshot,
  settingsSetters,
  settingsKey,
  storageKey,
  remoteApplyingRef,
  suppressNextSettingsEffectRef,
}: ApplyRemoteSnapshotParams) {
  if (!editor || !snapshot.html) return false;
  const sameHtml = snapshot.html === editor.getHTML();
  if (sameHtml && !snapshot.settings) return false;
  try {
    remoteApplyingRef.current = true;
    suppressNextSettingsEffectRef.current = true;
    if (!sameHtml) editor.commands.setContent(snapshot.html);
    if (snapshot.settings) {
      applyDocumentSettings(snapshot.settings, settingsSetters);
      localStorage.setItem(settingsKey, JSON.stringify(snapshot.settings));
    }
  } finally {
    remoteApplyingRef.current = false;
  }
  localStorage.setItem(storageKey, snapshot.html);
  return true;
}

export function applyRemoteStepsToEditor({
  editor,
  payload,
  storageKey,
  remoteApplyingRef,
}: ApplyRemoteStepsParams) {
  if (!editor || payload.stale || !payload.steps.length) return false;
  try {
    remoteApplyingRef.current = true;
    let transaction = editor.state.tr;
    payload.steps.forEach((stepJson) => {
      transaction = transaction.step(Step.fromJSON(editor.schema, stepJson));
    });
    if (!transaction.docChanged) return false;
    editor.view.dispatch(transaction);
    localStorage.setItem(storageKey, editor.getHTML());
    return true;
  } catch {
    return false;
  } finally {
    remoteApplyingRef.current = false;
  }
}
