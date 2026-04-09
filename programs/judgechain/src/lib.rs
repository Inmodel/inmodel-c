use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod judgechain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("JudgeChain initialized!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

// Account Structures from PRD

#[account]
pub struct Hackathon {
    pub organizer: Pubkey,
    pub name: String,
    pub is_active: bool,
}

#[account]
pub struct Submission {
    pub hackathon_id: Pubkey,
    pub problem_id: String,
    pub participant_wallet: Pubkey,
    pub repo_url: String,
    pub deployment_url: String,
}

#[account]
pub struct ScoreHash {
    pub submission_id: Pubkey,
    pub system_score: u8,
    pub judge_score: u8,
    pub final_score: u8,
    pub ipfs_cid: String,
}

// Added per User review: Certificate PDA account for NFT metadata URI storage
#[account]
pub struct Certificate {
    pub submission_id: Pubkey,
    pub metadata_uri: String,
    pub minted_at: i64,
}
