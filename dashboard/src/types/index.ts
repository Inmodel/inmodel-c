export interface CertificateAccount {
  submissionId: string;
  metadataUri: string;
  mintedAt: number;
}

export interface SystemScore {
  code_quality: number;
  test_coverage: number;
  deployment_health: number;
  documentation: number;
  custom_criteria: number;
  total: number;
}

export interface ScoreResult {
  submission_id: string;
  problem_id: string;
  wallet: string;
  system_score: SystemScore;
  judge_score: number | null;
  final_score: number | null;
  tx_hash: string | null;
  status: string;
  judge_submitted?: boolean;
}

export interface ProblemMetadata {
  title: string;
  description?: string;
}
