import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import { Judgechain } from "../target/types/judgechain";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

describe("judgechain", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Judgechain as Program<Judgechain>;

  const organizer = provider.wallet;
  const participant = Keypair.generate();
  const collection = Keypair.generate();
  const asset = Keypair.generate();

  let hackathonPda: PublicKey;
  let submissionPda: PublicKey;
  let scorePda: PublicKey;
  let certificatePda: PublicKey;

  before(async () => {
    [hackathonPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), organizer.publicKey.toBuffer()],
      program.programId
    );
    [submissionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("submission"), hackathonPda.toBuffer(), participant.publicKey.toBuffer()],
      program.programId
    );
    [scorePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), submissionPda.toBuffer()],
      program.programId
    );
    [certificatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("certificate"), submissionPda.toBuffer()],
      program.programId
    );

    // Fund participant
    const sig = await provider.connection.requestAirdrop(participant.publicKey, 1e9);
    await provider.connection.confirmTransaction(sig);
  });

  // ── Task 1: create_hackathon happy path ──────────────────────────────────
  it("create_hackathon — stores organizer, name, is_active", async () => {
    await program.methods
      .createHackathon("Test Hackathon")
      .accounts({
        organizer: organizer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.hackathon.fetch(hackathonPda);
    expect(account.organizer.toBase58()).to.equal(organizer.publicKey.toBase58());
    expect(account.name).to.equal("Test Hackathon");
    expect(account.isActive).to.be.true;
  });

  // ── Task 2: create_submission ────────────────────────────────────────────
  it("create_submission — stores submission fields", async () => {
    await program.methods
      .createSubmission("problem_1", "https://github.com/test/repo", "https://deploy.test")
      .accounts({
        participant: participant.publicKey,
        hackathon: hackathonPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([participant])
      .rpc();

    const account = await program.account.submission.fetch(submissionPda);
    expect(account.problemId).to.equal("problem_1");
    expect(account.participantWallet.toBase58()).to.equal(participant.publicKey.toBase58());
  });

  // ── Task 3: score_submission happy path ─────────────────────────────────
  it("score_submission — stores scores and ipfs_cid", async () => {
    const judge = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(judge.publicKey, 1e9);
    await provider.connection.confirmTransaction(sig);

    await program.methods
      .scoreSubmission(80, 90, "ipfs://QmTestCid")
      .accounts({
        judge: judge.publicKey,
        submission: submissionPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([judge])
      .rpc();

    const account = await program.account.scoreHash.fetch(scorePda);
    expect(account.systemScore).to.equal(80);
    expect(account.judgeScore).to.equal(90);
    expect(account.finalScore).to.equal(85); // (80/2) + (90/2)
    expect(account.ipfsCid).to.equal("ipfs://QmTestCid");
  });

  // ── Task 4: score_submission re-score must fail (init constraint) ────────
  it("score_submission — re-scoring same submission fails", async () => {
    const judge2 = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(judge2.publicKey, 1e9);
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .scoreSubmission(50, 50, "ipfs://QmOtherCid")
        .accounts({
          judge: judge2.publicKey,
          submission: submissionPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([judge2])
        .rpc();
      expect.fail("Expected re-score to fail");
    } catch (err) {
      // Account already exists — Anchor init constraint rejects it
      expect(err.message).to.include("already in use");
    }
  });

  // ── Task 5: issue_certificate — score >= 50 passes ───────────────────────
  it("issue_certificate — mints soulbound NFT when score >= 50", async () => {
    const tx = await program.methods
      .issueCertificate("https://arweave.net/cert.json", "JudgeChain Certificate #1")
      .accounts({
        payer: organizer.publicKey,
        participant: participant.publicKey,
        submission: submissionPda,
        asset: asset.publicKey,
        collection: collection.publicKey,
        coreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([asset])
      .rpc();

    const certAccount = await program.account.certificate.fetch(certificatePda);
    expect(certAccount.metadataUri).to.equal("https://arweave.net/cert.json");
    expect(certAccount.mintedAt.toNumber()).to.be.greaterThan(0);
    console.log("Certificate tx:", tx);
  });

  // ── Task 6: issue_certificate — score < 50 rejected ─────────────────────
  it("issue_certificate — rejects when score < 50", async () => {
    // Set up a fresh participant with a low score
    const lowParticipant = Keypair.generate();
    const lowAsset = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(lowParticipant.publicKey, 1e9);
    await provider.connection.confirmTransaction(sig);

    const [lowSubmissionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("submission"), hackathonPda.toBuffer(), lowParticipant.publicKey.toBuffer()],
      program.programId
    );
    const [lowScorePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), lowSubmissionPda.toBuffer()],
      program.programId
    );

    await program.methods
      .createSubmission("problem_2", "https://github.com/low/repo", "https://low.test")
      .accounts({
        participant: lowParticipant.publicKey,
        hackathon: hackathonPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([lowParticipant])
      .rpc();

    const judge = Keypair.generate();
    const sig2 = await provider.connection.requestAirdrop(judge.publicKey, 1e9);
    await provider.connection.confirmTransaction(sig2);

    await program.methods
      .scoreSubmission(30, 40, "ipfs://QmLowScore")
      .accounts({
        judge: judge.publicKey,
        submission: lowSubmissionPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([judge])
      .rpc();

    try {
      await program.methods
        .issueCertificate("https://arweave.net/low.json", "Low Score Cert")
        .accounts({
          payer: organizer.publicKey,
          participant: lowParticipant.publicKey,
          submission: lowSubmissionPda,
          asset: lowAsset.publicKey,
          collection: collection.publicKey,
          coreProgram: MPL_CORE_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([lowAsset])
        .rpc();
      expect.fail("Expected ScoreTooLow error");
    } catch (err) {
      if (err instanceof AnchorError) {
        expect(err.error.errorCode.code).to.equal("ScoreTooLow");
      } else {
        // May fail for other reasons on devnet (MPL Core not available), but score check fires first
        expect(err.message).to.include("ScoreTooLow");
      }
    }
  });
});
