import type { EditorUser } from "../core/policy";

export interface Signature {
  signerId: string;
  signerName: string;
  at: number;
  reason: string;
  /** e.g. "password", "totp", "biometric", "hsm", "docusign". */
  method: string;
  /** Opaque host-controlled token / hash / cert thumbprint. */
  proof: string;
}

export interface SignatureRequest {
  action: string;
  reason: string;
  documentId: string;
  user: EditorUser;
  /** Arbitrary host-visible context for the ceremony UI. */
  meta?: Record<string, unknown>;
}

/**
 * SignatureCeremony drives the host-owned e-signature flow. Returning
 * `null` means the user cancelled or failed; the editor treats that as
 * a rejection and skips the action.
 */
export interface SignatureCeremony {
  sign(request: SignatureRequest): Promise<Signature | null>;
}

/**
 * Default ceremony for unregulated environments - no signing happens.
 * Regulated hosts must supply their own.
 */
export const noopSignatureCeremony: SignatureCeremony = {
  async sign() {
    return null;
  },
};
