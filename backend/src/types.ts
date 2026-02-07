/**
 * Project record stored by the backend. No funds are held here;
 * all money is in the Soroban contract.
 */
export interface ProjectRecord {
  id: string;
  contractId: string;
  businessAddress: string;
  freelancerAddress: string;
  tokenId: string;
  totalAmount: string;
  advanceAmount: string;
  milestoneAmounts: string[];
  milestoneDeadlinesTs: number[];
  finalDeadlineTs: number;
  verificationWindowSecs: number;
  createdAt: number;
}

export interface CreateProjectBody {
  contractId: string;
  businessAddress: string;
  freelancerAddress: string;
  tokenId: string;
  totalAmount: string;
  advanceAmount: string;
  milestoneAmounts: string[];
  milestoneDeadlinesTs: number[];
  finalDeadlineTs: number;
  verificationWindowSecs: number;
  /** Message signed by business wallet (e.g. projectId or create payload hash) */
  signature?: string;
  /** Public key of business (for verification) */
  publicKey?: string;
}

export interface MilestoneSubmitBody {
  projectId: string;
  milestoneIndex: number;
  /** Raw file bytes (base64) or omitted if hashOnly */
  deliverableBase64?: string;
  /** Precomputed hash (hex) if client hashes client-side */
  deliverableHashHex?: string;
}

export interface MilestoneApproveBody {
  projectId: string;
  milestoneIndex: number;
  /** Signature from business wallet */
  signature?: string;
  publicKey?: string;
}

export interface RefundBody {
  projectId: string;
}
