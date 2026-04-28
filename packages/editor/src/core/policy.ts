import type { EditorMode } from "./types";

export interface EditorUser {
  id: string;
  name: string;
  color: string;
  /** Host-defined role(s). The policy is free to ignore or use these. */
  roles?: string[];
  /** Additional host-provided claims the policy can inspect. */
  claims?: Record<string, unknown>;
}

export interface PolicyDecision {
  allowed: boolean;
  /** Human-readable reason - surfaced to users and logged for audit. */
  reason?: string;
  /**
   * When `true`, the host should trigger an e-signature ceremony
   * before the action is allowed. Regulated systems use this for
   * Part-11 / SOX sign-offs.
   */
  requiresSignature?: boolean;
}

/**
 * Description of a block whose structure or content the policy is
 * being asked to gate. `type` is the ProseMirror node type name; the
 * rest is the node's attribute bag (id, mutableContent, instruction,
 * etc.) so the policy can pivot on anything the schema declares.
 */
export interface BlockDescriptor {
  type: string;
  id: string | null;
  attrs: Record<string, unknown>;
}

/**
 * Description of a `field` instance whose value is changing. The
 * `fieldId` identifies the host's `FieldDefinition`.
 */
export interface FieldDescriptor {
  /** Per-instance node id. */
  id: string | null;
  /** Definition id used to look up the host's `FieldDefinition`. */
  fieldId: string;
  value: unknown;
}

export interface PolicyContext {
  user: EditorUser;
  documentId: string;
  /** Arbitrary host claims (feature flags, document metadata, etc.). */
  claims?: Record<string, unknown>;
  /**
   * Template authoring vs. document consumption. The default policy
   * uses this to decide whether structural edits are allowed.
   */
  mode: EditorMode;
}

/**
 * PermissionPolicy is the single gate every privileged editor action
 * flows through. Host apps can wire role-based rules, feature flags,
 * document-state guards, or external authorization services here.
 *
 * The library treats `allowed: false` as authoritative: commands
 * silently no-op and emit a `permission.denied` event carrying the
 * `reason`. When `requiresSignature: true`, commands check for the
 * presence of a `SignatureCeremony` driver and run it before
 * applying.
 */
export interface PermissionPolicy {
  /** Coarse global gate — set to false for fully-readonly views. */
  canEditDocument(ctx: PolicyContext): PolicyDecision;

  /**
   * Gate for any structural mutation inside a container — adding,
   * removing, or reordering its children. The container is `doc`,
   * a `section`, or an `editableField`. The default policy:
   *   - template mode: always allow
   *   - document mode:
   *     - `editableField`: allow (rich text inside is free-form)
   *     - `section` with `mutableContent === true`: allow
   *     - everything else: deny
   */
  canModifyStructure(
    ctx: PolicyContext & { container: BlockDescriptor },
  ): PolicyDecision;

  /**
   * Gate for content edits inside an `editableField` wrapper. Default
   * policy: allow in both modes; hosts override to lock fields once a
   * document enters approval / signing.
   */
  canFillField(
    ctx: PolicyContext & { field: BlockDescriptor },
  ): PolicyDecision;

  /**
   * Gate for value changes on a `field` (host-rendered control). The
   * NodeView calls this before forwarding `onChange` to the host.
   */
  canChangeFieldValue(
    ctx: PolicyContext & {
      field: FieldDescriptor;
      from: unknown;
      to: unknown;
    },
  ): PolicyDecision;

  canToggleTrackChanges(ctx: PolicyContext): PolicyDecision;
  canAcceptChanges(ctx: PolicyContext): PolicyDecision;
  canRejectChanges(ctx: PolicyContext): PolicyDecision;

  canSaveVersion(ctx: PolicyContext): PolicyDecision;
  canRestoreVersion(
    ctx: PolicyContext & { snapshotId: string },
  ): PolicyDecision;
  canDeleteVersion(
    ctx: PolicyContext & { snapshotId: string },
  ): PolicyDecision;

  /**
   * Evaluator for arbitrary host expressions. Currently used by
   * conditional field visibility (planned). Hosts that don't need
   * conditions can return `false`.
   */
  evaluateCondition(
    expression: string,
    ctx: PolicyContext,
  ): boolean;
}

const ALLOW: PolicyDecision = { allowed: true };

/**
 * Default policy — permissive defaults suitable for a local playground.
 * Regulated hosts should supply their own.
 *
 * Mode drives the structural defaults:
 * - `template`: authors shape the template freely. Anything goes.
 * - `document`: structure is frozen except inside `editableField`
 *   wrappers and inside `section` blocks marked `mutableContent`.
 *
 * Field value changes default to allowed in both modes; lock them
 * down in your override when the document enters approval.
 */
export function defaultPermissionPolicy(overrides: {
  evaluateCondition?: (expression: string, ctx: PolicyContext) => boolean;
} = {}): PermissionPolicy {
  const evaluate =
    overrides.evaluateCondition ??
    ((expression: string, ctx: PolicyContext) => {
      if (ctx.mode === "document") {
        console.warn(
          `[editor] evaluateCondition("${expression}") called with the built-in no-op evaluator. ` +
            "Conditional field visibility will always be false. " +
            "Supply an evaluateCondition override to defaultPermissionPolicy() " +
            "or implement PermissionPolicy to enable condition evaluation.",
        );
      }
      return false;
    });

  const denyDocOnly = (action: string): PolicyDecision => ({
    allowed: false,
    reason: `${action} is only available while authoring a template`,
  });

  return {
    canEditDocument: () => ALLOW,

    canModifyStructure: ({ mode, container }) => {
      if (mode === "template") return ALLOW;
      // Document mode: only certain containers permit structural changes.
      switch (container.type) {
        case "editableField":
          return ALLOW;
        case "section":
          return container.attrs.mutableContent === true
            ? ALLOW
            : {
                allowed: false,
                reason:
                  "Section structure is fixed by the template",
              };
        case "doc":
          return {
            allowed: false,
            reason: "Document outline is fixed by the template",
          };
        default:
          return denyDocOnly("Modifying structure");
      }
    },

    canFillField: () => ALLOW,
    canChangeFieldValue: () => ALLOW,

    canToggleTrackChanges: () => ALLOW,
    canAcceptChanges: () => ALLOW,
    canRejectChanges: () => ALLOW,
    canSaveVersion: () => ALLOW,
    canRestoreVersion: () => ALLOW,
    canDeleteVersion: () => ALLOW,
    evaluateCondition: evaluate,
  };
}
