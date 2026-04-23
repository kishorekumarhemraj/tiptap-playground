import type { LockMode } from "../extensions/locked-block/LockedBlock";

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
 * - Hard-locked blocks and read-only blocks reject edits.
 * - Conditional blocks reject edits unless an `evaluator` opts them in.
 * - Everything else is allowed.
 */
export function defaultPermissionPolicy(overrides: {
  evaluateCondition?: (expression: string, ctx: PolicyContext) => boolean;
} = {}): PermissionPolicy {
  const evaluate =
    overrides.evaluateCondition ?? (() => false);

  return {
    canEditDocument: () => ALLOW,
    canEditBlock: ({ block, ...rest }) => {
      if (block.mode === "locked") {
        return { allowed: false, reason: block.reason ?? "Block is locked" };
      }
      if (block.mode === "readonly") {
        return { allowed: false, reason: "Block is read-only" };
      }
      if (block.mode === "conditional") {
        const ok = block.condition
          ? evaluate(block.condition, { user: rest.user, documentId: rest.documentId, claims: rest.claims })
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
    canSetLock: () => ALLOW,
    canUnlock: () => ALLOW,
    canChangeLockMode: () => ALLOW,
    canToggleTrackChanges: () => ALLOW,
    canAcceptChanges: () => ALLOW,
    canRejectChanges: () => ALLOW,
    canSaveVersion: () => ALLOW,
    canRestoreVersion: () => ALLOW,
    canDeleteVersion: () => ALLOW,
    evaluateCondition: evaluate,
  };
}
