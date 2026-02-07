/**
 * Project record stored by the backend. No funds held; all money in Soroban contract.
 */
export interface ProjectRecord {
  id: string;
  /** Set after hiring person deploys contract (post-acceptance). */
  contractId?: string;
  businessAddress: string;
  /** Set when hiring person accepts a freelancer. */
  freelancerAddress?: string;
  tokenId: string;
  title: string;
  description: string;
  totalAmount: string;
  /** Fixed 30% advance. */
  advanceAmount: string;
  deliveryDeadlineTs: number;
  verificationWindowSecs: number;
  /** Freelancer addresses that applied. */
  applicants: string[];
  createdAt: number;
}

export interface CreateProjectBody {
  businessAddress: string;
  tokenId: string;
  title: string;
  description: string;
  totalAmount: string;
  deliveryDeadlineTs: number;
  verificationWindowSecs?: number;
  signature?: string;
  publicKey?: string;
}

export interface SetContractBody {
  contractId: string;
}

export interface ApplyBody {
  freelancerAddress: string;
}

export interface SubmitBody {
  deliverableBase64?: string;
  deliverableHashHex?: string;
}
