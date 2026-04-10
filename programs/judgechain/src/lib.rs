use anchor_lang::prelude::*;
use mpl_core::{
    instructions::{CreateCollectionV1CpiBuilder, CreateV1CpiBuilder},
    types::{Plugin, PluginAuthorityPair, PermanentFreezeDelegate},
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod judgechain {
    use super::*;

    pub fn create_hackathon(ctx: Context<CreateHackathon>, name: String) -> Result<()> {
        let hackathon = &mut ctx.accounts.hackathon;
        hackathon.organizer = ctx.accounts.organizer.key();
        hackathon.name = name;
        hackathon.is_active = true;
        Ok(())
    }

    pub fn create_collection(
        ctx: Context<CreateCollection>,
        name: String,
        uri: String,
    ) -> Result<()> {
        CreateCollectionV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
            .collection(&ctx.accounts.collection.to_account_info())
            .payer(&ctx.accounts.payer.to_account_info())
            .update_authority(Some(&ctx.accounts.hackathon.to_account_info()))
            .name(name)
            .uri(uri)
            .invoke_signed(&[&[
                b"hackathon",
                ctx.accounts.hackathon.organizer.as_ref(),
                &[ctx.bumps.hackathon],
            ]])?;

        Ok(())
    }

    pub fn create_submission(
        ctx: Context<CreateSubmission>,
        problem_id: String,
        repo_url: String,
        deployment_url: String,
    ) -> Result<()> {
        let submission = &mut ctx.accounts.submission;
        submission.hackathon_id = ctx.accounts.hackathon.key();
        submission.participant_wallet = ctx.accounts.participant.key();
        submission.problem_id = problem_id;
        submission.repo_url = repo_url;
        submission.deployment_url = deployment_url;
        Ok(())
    }

    pub fn score_submission(
        ctx: Context<ScoreSubmission>,
        system_score: u8,
        judge_score: u8,
        ipfs_cid: String,
    ) -> Result<()> {
        require!(system_score <= 100 && judge_score <= 100, JudgeChainError::InvalidScore);
        let score = &mut ctx.accounts.score_hash;
        score.submission_id = ctx.accounts.submission.key();
        score.system_score = system_score;
        score.judge_score = judge_score;
        score.final_score = (system_score / 2) + (judge_score / 2);
        score.ipfs_cid = ipfs_cid;
        Ok(())
    }

    pub fn issue_certificate(
        ctx: Context<IssueCertificate>,
        metadata_uri: String,
        name: String,
    ) -> Result<()> {
        // Enforce basic minimum score threshold
        require!(ctx.accounts.score_hash.final_score >= 50, JudgeChainError::ScoreTooLow);

        let certificate = &mut ctx.accounts.certificate;
        let clock = Clock::get()?;
        certificate.submission_id = ctx.accounts.submission.key();
        certificate.metadata_uri = metadata_uri.clone();
        certificate.minted_at = clock.unix_timestamp;

        // Freeze delegate plugin for soulbound
        let plugins = vec![PluginAuthorityPair {
            plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
            authority: None, // No one can unfreeze it
        }];

        CreateV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
            .asset(&ctx.accounts.asset.to_account_info())
            .collection(Some(&ctx.accounts.collection.to_account_info()))
            .authority(Some(&ctx.accounts.hackathon.to_account_info()))
            .payer(&ctx.accounts.payer.to_account_info())
            .owner(Some(&ctx.accounts.participant.to_account_info()))
            .name(name)
            .uri(metadata_uri)
            .plugins(plugins)
            .invoke_signed(&[&[
                b"hackathon",
                ctx.accounts.hackathon.organizer.as_ref(),
                &[ctx.bumps.hackathon],
            ]])?;

        Ok(())
    }
}

// --- Contexts ---

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateHackathon<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    #[account(
        init,
        payer = organizer,
        space = 8 + 32 + 4 + 64 + 1,
        seeds = [b"hackathon", organizer.key().as_ref()],
        bump
    )]
    pub hackathon: Account<'info, Hackathon>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateCollection<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub collection: Signer<'info>,

    #[account(
        seeds = [b"hackathon", hackathon.organizer.as_ref()],
        bump
    )]
    pub hackathon: Account<'info, Hackathon>,

    /// CHECK: Metaplex Core Program
    pub core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSubmission<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,

    pub hackathon: Account<'info, Hackathon>,

    #[account(
        init,
        payer = participant,
        space = 8 + 32 + 32 + 4 + 50 + 4 + 100 + 4 + 100,
        seeds = [b"submission", hackathon.key().as_ref(), participant.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, Submission>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ScoreSubmission<'info> {
    #[account(mut)]
    pub judge: Signer<'info>,

    pub submission: Account<'info, Submission>,

    #[account(
        init,
        payer = judge,
        space = 8 + 32 + 1 + 1 + 1 + 4 + 64,
        seeds = [b"score", submission.key().as_ref()],
        bump
    )]
    pub score_hash: Account<'info, ScoreHash>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct IssueCertificate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: NFT recipient
    pub participant: UncheckedAccount<'info>,

    pub submission: Account<'info, Submission>,

    #[account(
        seeds = [b"score", submission.key().as_ref()],
        bump
    )]
    pub score_hash: Account<'info, ScoreHash>,

    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 4 + 200 + 8,
        seeds = [b"certificate", submission.key().as_ref()],
        bump
    )]
    pub certificate: Account<'info, Certificate>,

    #[account(mut)]
    pub asset: Signer<'info>,

    #[account(mut)]
    /// CHECK: Metaplex Core Collection
    pub collection: UncheckedAccount<'info>,

    #[account(
        seeds = [b"hackathon", hackathon.organizer.as_ref()],
        bump
    )]
    pub hackathon: Account<'info, Hackathon>,

    /// CHECK: Metaplex Core Program
    pub core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// --- Accounts ---

#[account]
pub struct Hackathon {
    pub organizer: Pubkey,   // 32
    pub name: String,        // 4 + 64
    pub is_active: bool,     // 1
}

#[account]
pub struct Submission {
    pub hackathon_id: Pubkey,        // 32
    pub participant_wallet: Pubkey,  // 32
    pub problem_id: String,          // 4 + 50
    pub repo_url: String,            // 4 + 100
    pub deployment_url: String,      // 4 + 100
}

#[account]
pub struct ScoreHash {
    pub submission_id: Pubkey,  // 32
    pub system_score: u8,       // 1
    pub judge_score: u8,        // 1
    pub final_score: u8,        // 1
    pub ipfs_cid: String,       // 4 + 64
}

#[account]
pub struct Certificate {
    pub submission_id: Pubkey,  // 32
    pub metadata_uri: String,   // 4 + 200
    pub minted_at: i64,         // 8
}

// --- Errors ---

#[error_code]
pub enum JudgeChainError {
    #[msg("Score must be between 0 and 100")]
    InvalidScore,
    #[msg("Score is too low to receive a certificate")]
    ScoreTooLow,
}
