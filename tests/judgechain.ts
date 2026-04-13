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

  const HACKATHON_ID = 1337;
  const idBuffer = Buffer.alloc(4);
  idBuffer.writeUInt32LE(HACKATHON_ID, 0);

  let hackathonPda: PublicKey;
  let submissionPda: PublicKey;
  let scorePda: PublicKey;
  let certificatePda: PublicKey;

  before(async () => {
    [hackathonPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), organizer.publicKey.toBuffer(), idBuffer],
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
  it("create_hackathon — stores organizer, id, name, is_active", async () => {
    await program.methods
      .createHackathon(HACKATHON_ID, "Test Hackathon")
      .accounts({
        organizer: organizer.publicKey,
      })
      .rpc();

    const account = await program.account.hackathon.fetch(hackathonPda);
    expect(account.organizer.toBase58()).to.equal(organizer.publicKey.toBase58());
    expect(account.id).to.equal(HACKATHON_ID);
    expect(account.name).to.equal("Test Hackathon");
    expect(account.isActive).to.be.true;
  });

  it("create_hackathon — fails if name too long", async () => {
    const longName = "A".repeat(65);
    try {
      await program.methods
        .createHackathon(HACKATHON_ID + 1, longName)
        .accounts({
          organizer: organizer.publicKey,
        })
        .rpc();
      expect.fail("Should have failed");
    } catch (err) {
      expect(err.message).to.include("StringTooLong");
    }
  });

  // ── Task 2: create_submission ────────────────────────────────────────────
  it("create_submission — stores submission fields", async () => {
    await program.methods
      .createSubmission("problem_1", "https://github.com/test/repo", "https://deploy.test")
      .accounts({
        participant: participant.publicKey,
        hackathon: hackathonPda,
      })
      .signers([participant])
      .rpc();

    const account = await program.account.submission.fetch(submissionPda);
    expect(account.problemId).to.equal("problem_1");
    expect(account.participantWallet.toBase58()).to.equal(participant.publicKey.toBase58());
  });

  // ── Task 3: score_submission happy path ─────────────────────────────────
  it("score_submission — requires organizer signer", async () => {
    const judge = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(judge.publicKey, 1e9);
    await provider.connection.confirmTransaction(sig);

    await program.methods
      .scoreSubmission(80, 90, "ipfs://QmTestCid")
      .accounts({
        judge: judge.publicKey,
        submission: submissionPda,
        organizer: organizer.publicKey,
      })
      .signers([judge])
      .rpc();

    const account = await program.account.scoreHash.fetch(scorePda);
    expect(account.systemScore).to.equal(80);
    expect(account.judgeScore).to.equal(90);
    expect(account.finalScore).to.equal(83); // integer match: (80*7)/10 + (90*3)/10 = 56 + 27 = 83
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
          organizer: organizer.publicKey,
        })
        .signers([judge2])
        .rpc();
      expect.fail("Expected re-score to fail");
    } catch (err) {
      expect(err.message).to.include("already in use");
    }
  });

  // ── Task 5: finalize_hackathon ──────────────────────────────────────────
  it("finalize_hackathon — locks the hackathon", async () => {
    await program.methods
      .finalizeHackathon()
      .accounts({
        organizer: organizer.publicKey,
        hackathon: hackathonPda,
      })
      .rpc();

    const account = await program.account.hackathon.fetch(hackathonPda);
    expect(account.isActive).to.be.false;
  });

  // ── Task 6: issue_certificate — score >= 50 passes ───────────────────────
  it("issue_certificate — mints soulbound NFT when score >= 50 and finalized", async () => {
    await program.methods
      .issueCertificate("https://arweave.net/cert.json", "JudgeChain Certificate #1")
      .accounts({
        payer: organizer.publicKey,
        participant: participant.publicKey,
        submission: submissionPda,
        asset: asset.publicKey,
        collection: collection.publicKey,
        coreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([asset])
      .rpc();

    const certAccount = await program.account.certificate.fetch(certificatePda);
    expect(certAccount.metadataUri).to.equal("https://arweave.net/cert.json");
    expect(certAccount.mintedAt.toNumber()).to.be.greaterThan(0);
  });
});
