/**
 * Program IDL type definition for JudgeChain.
 * This file is managed by the Blockchain Agent but initialized here as a placeholder.
 */
export type Judgechain = {
  "version": "0.1.0",
  "name": "judgechain",
  "address": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  "metadata": { "name": "judgechain", "version": "0.1.0", "spec": "0.1.0" },
  "instructions": [
    {
      "name": "createHackathon",
      "discriminator": [0,0,0,0,0,0,0,1],
      "accounts": [
        { "name": "organizer", "isMut": true, "isSigner": true },
        { "name": "hackathon", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [{ "name": "name", "type": "string" }]
    },
    {
      "name": "createSubmission",
      "discriminator": [0,0,0,0,0,0,0,2],
      "accounts": [
        { "name": "participant", "isMut": true, "isSigner": true },
        { "name": "hackathon", "isMut": false, "isSigner": false },
        { "name": "submission", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "problemId", "type": "string" },
        { "name": "repoUrl", "type": "string" },
        { "name": "deploymentUrl", "type": "string" }
      ]
    },
    {
      "name": "scoreSubmission",
      "discriminator": [0,0,0,0,0,0,0,3],
      "accounts": [
        { "name": "judge", "isMut": true, "isSigner": true },
        { "name": "submission", "isMut": false, "isSigner": false },
        { "name": "scoreHash", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "systemScore", "type": "u8" },
        { "name": "judgeScore", "type": "u8" },
        { "name": "ipfsCid", "type": "string" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "ScoreHash",
      "discriminator": [0,0,0,0,0,0,0,4],
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "submissionId", "type": "publicKey" },
          { "name": "systemScore", "type": "u8" },
          { "name": "judgeScore", "type": "u8" },
          { "name": "finalScore", "type": "u8" },
          { "name": "ipfsCid", "type": "string" }
        ]
      }
    },
    {
      "name": "Submission",
      "discriminator": [0,0,0,0,0,0,0,5],
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "hackathonId", "type": "publicKey" },
          { "name": "participantWallet", "type": "publicKey" },
          { "name": "problemId", "type": "string" },
          { "name": "repoUrl", "type": "string" },
          { "name": "deploymentUrl", "type": "string" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "InvalidScore", "msg": "Score must be between 0 and 100" }
  ]
};
