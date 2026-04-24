import type { LockMode } from "../extensions/locked-block/LockedBlock";
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

export interface LockedBlockDescriptor {
  mode: LockMode;
  reason: string | null;
  condition: string | null;
  lockedBy: string | null;
}

export interface PolicyContext {
  user: EditorUser;
  documentId: string;
  /** Arbitrary host claims (feature flags, document metadata, etc.). */
  claims?: Record<string, unknown>;
  /**
   * Template authoring vs. document consumption. The default policy
   * uses this to decide whether lock-bearing actions (set lock,
   * change mode, move a locked block) are allowed.
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
  canEditDocument(ctx: PolicyContext): PolicyDecision;
  canEditBlock(
    ctx: PolicyContext & { block: LockedBlockDescriptor },
  ): PolicyDecision;

  canSetLock(
    ctx: PolicyContext & { target: LockedBlockDescriptor },
  ): PolicyDecision;
  canUnlock(
    ctx: PolicyContext & { target: LockedBlockDescriptor },
  ): PolicyDecision;
  canChangeLockMode(
    ctx: PolicyContext & {
      from: LockMode;
      to: LockMode;
      target: LockedBlockDescriptor;
    },
  ): PolicyDecision;
  /**
   * Gate for moving (drag/drop, cut, indent) a *locked* block to a
   * different position. Content-level edits inside the block still
   * go through `canEditBlock`.
   */
  canMoveBlock(
    ctx: PolicyContext & { block: LockedBlockDescriptor },
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
   * Evaluator for a `conditional` lock's expression. The expression
   * string lives in the document; evaluation lives here so hosts
   * decide whether a block is editable based on current state.
   */
  evaluateCondition(
    expression: string,
    ctx: PolicyContext,
  ): boolean;
}

const ALLOW: PolicyDecision = { allowed: true };

/**
 * Default policy - permissive with reasonable defaults for a local
 * playground. Regulated hosts should supply their own.
 *
 * Mode drives the defaults:
 * - `template`: authors shape the template. Locked/readonly blocks
 *   are still editable and the lock itself can be set, cleared,
 *   changed, or moved. This lets the author draft locked sections.
 * - `document`: consumers fill in a document instantiated from a
 *   template. Locked / read-only blocks reject edits and moves,
 *   and the lock itself cannot be toggled.
 * Conditional blocks defer to `evaluateCondition` in both modes.
 */
export function defaultPermissionPolicy(overrides: {
  evaluateCondition?: (expression: string, ctx: PolicyContext) => boolean;
} = {}): PermissionPolicy {
  const evaluate =
    overrides.evaluateCondition ?? (() => false);

  const templateOnly = (action: string): PolicyDecision => ({
    allowed: false,
    reason: `${action} is only available while authoring a template`,
  });

  return {
    canEditDocument: () => ALLOW,
    canEditBlock: ({ block, mode, ...rest }) => {
      if (mode === "template") return ALLOW;
      if (block.mode === "locked") {
        return { allowed: false, reason: block.reason ?? "Block is locked" };
      }
      if (block.mode === "readonly") {
        return { allowed: false, reason: "Block is read-only" };
      }
      if (block.mode === "conditional") {
        const ok = block.condition
          ? evaluate(block.condition, {
              user: rest.user,
              documentId: rest.documentId,
              claims: rest.claims,
              mode,
            })
          : false;
        return ok
          ? ALLOW
          : {
              allowed: false,
              reason: "Conditional block - condition not satisfied",
            };
      }
      return ALLOW;
    },
    canSetLock: ({ mode }) =>
      mode === "template" ? ALLOW : templateOnly("Locking a block"),
    canUnlock: ({ mode }) =>
      mode === "template" ? ALLOW : templateOnly("Unlocking a block"),
    canChangeLockMode: ({ mode }) =>
      mode === "template" ? ALLOW : templateOnly("Changing lock mode"),
    canMoveBlock: ({ block, mode }) => {
      if (mode === "template") return ALLOW;
      if (block.mode === "locked" || block.mode === "readonly") {
        return {
          allowed: false,
          reason: "Locked blocks cannot be moved in a document",
        };
      }
      return ALLOW;
    },
    canToggleTrackChanges: () => ALLOW,
    canAcceptChanges: () => ALLOW,
    canRejectChanges: () => ALLOW,
    canSaveVersion: () => ALLOW,
    canRestoreVersion: () => ALLOW,
    canDeleteVersion: () => ALLOW,
    evaluateCondition: evaluate,
  };
}
