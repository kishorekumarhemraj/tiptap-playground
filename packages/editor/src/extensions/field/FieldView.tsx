"use client";

import { useEffect, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { FieldExtensionStorage } from "./Field";
import type { FieldDefinition } from "../../drivers/field-registry";
import styles from "./FieldView.module.css";

function readDef(
  storage: FieldExtensionStorage | undefined,
  fieldId: string | null,
): FieldDefinition | null {
  if (!storage?.registry || !fieldId) return null;
  const result = storage.registry.get(fieldId);
  // Async resolution is rare for in-memory registries — let the
  // subscribe() side trigger the rerender. For sync results we
  // return immediately.
  return result instanceof Promise ? null : result;
}

export function FieldView({ node, editor, updateAttributes }: NodeViewProps) {
  const storage = (editor.storage as { field?: FieldExtensionStorage }).field;
  const editorMode = storage?.editorMode ?? "document";
  const fieldId = (node.attrs.fieldId as string | null) ?? null;
  const value = node.attrs.value;
  const nodeId = (node.attrs.id as string | null) ?? null;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = storage?.registry?.subscribe?.(() => setTick((n) => n + 1));
    return () => {
      unsub?.();
    };
  }, [storage]);

  // Re-read the def whenever `tick` or fieldId changes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void tick;
  const def = readDef(storage, fieldId);
  const readOnly = !editor.isEditable || editorMode === "template";

  const commitValue = (next: unknown) => {
    if (storage?.policy && storage?.getPolicyContext) {
      const ctx = storage.getPolicyContext();
      const decision = storage.policy.canChangeFieldValue({
        ...ctx,
        field: { id: nodeId, fieldId: fieldId ?? "", value },
        from: value,
        to: next,
      });
      if (!decision.allowed) {
        storage.events?.emit("permission.denied", {
          action: "field.value.change",
          reason: decision.reason,
        });
        return;
      }
    }
    updateAttributes({ value: next });
    storage?.events?.emit("field.value.changed", {
      id: nodeId,
      fieldId: fieldId ?? "",
      from: value,
      to: next,
    });
    if (storage?.audit && storage?.getPolicyContext) {
      const ctx = storage.getPolicyContext();
      storage.audit.record({
        type: "field.value.changed",
        at: Date.now(),
        actor: { id: ctx.user.id, name: ctx.user.name },
        documentId: ctx.documentId,
        summary: `Field "${fieldId}" updated`,
        payload: { id: nodeId, fieldId, from: value, to: next },
      });
    }
  };

  const renderHost = storage?.registry?.render;

  return (
    <NodeViewWrapper
      as="span"
      className={styles.wrapper}
      data-field-id={fieldId ?? undefined}
      data-node-id={nodeId ?? undefined}
    >
      {def && renderHost ? (
        <span className={styles.host} contentEditable={false}>
          {renderHost({
            def,
            value,
            readOnly,
            onChange: commitValue,
          })}
        </span>
      ) : def ? (
        <span
          className={`${styles.fallback} ${def.required ? styles.required : ""}`}
          contentEditable={false}
          title={def.instruction ?? def.label}
        >
          <span className={styles.label}>{def.label}</span>
          {value === null || value === undefined || value === "" ? (
            <span className={`${styles.value} ${styles.empty}`}>—</span>
          ) : (
            <span className={styles.value}>{String(value)}</span>
          )}
        </span>
      ) : (
        <span
          className={`${styles.fallback} ${styles.unconfigured}`}
          contentEditable={false}
          title="Field definition not registered"
        >
          <span className={styles.label}>field</span>
          <span className={styles.value}>{fieldId ?? "?"}</span>
        </span>
      )}
    </NodeViewWrapper>
  );
}
