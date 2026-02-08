export interface ProjectRecord {
  id: string;
  contractId?: string;
  jobId?: number;
  businessAddress: string;
  freelancerAddress?: string;
  tokenId: string;
  title: string;
  description: string;
  totalAmount: string;
  advanceAmount: string;
  deliveryDeadlineTs: number;
  verificationWindowSecs: number;
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

export interface SetJobBody {
  jobId: number;
}

export interface ApplyBody {
  freelancerAddress: string;
}
