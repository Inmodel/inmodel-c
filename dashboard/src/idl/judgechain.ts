/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/judgechain.json`.
 */
export type Judgechain = {
  "address": "9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2",
  "metadata": {
    "name": "judgechain",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createCollection",
      "discriminator": [
        156,
        251,
        92,
        54,
        233,
        2,
        16,
        82
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "collection",
          "writable": true,
          "signer": true
        },
        {
          "name": "hackathon",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  97,
                  99,
                  107,
                  97,
                  116,
                  104,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "hackathon.organizer",
                "account": "hackathon"
              }
            ]
          }
        },
        {
          "name": "coreProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "createHackathon",
      "discriminator": [
        228,
        148,
        238,
        246,
        21,
        223,
        47,
        69
      ],
      "accounts": [
        {
          "name": "organizer",
          "writable": true,
          "signer": true
        },
        {
          "name": "hackathon",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  97,
                  99,
                  107,
                  97,
                  116,
                  104,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "organizer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "createSubmission",
      "discriminator": [
        85,
        217,
        61,
        59,
        157,
        60,
        175,
        220
      ],
      "accounts": [
        {
          "name": "participant",
          "writable": true,
          "signer": true
        },
        {
          "name": "hackathon"
        },
        {
          "name": "submission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "hackathon"
              },
              {
                "kind": "account",
                "path": "participant"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "problemId",
          "type": "string"
        },
        {
          "name": "repoUrl",
          "type": "string"
        },
        {
          "name": "deploymentUrl",
          "type": "string"
        }
      ]
    },
    {
      "name": "finalizeHackathon",
      "discriminator": [
        174,
        245,
        240,
        251,
        218,
        172,
        251,
        74
      ],
      "accounts": [
        {
          "name": "organizer",
          "writable": true,
          "signer": true,
          "relations": [
            "hackathon"
          ]
        },
        {
          "name": "hackathon",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  97,
                  99,
                  107,
                  97,
                  116,
                  104,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "organizer"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "issueCertificate",
      "discriminator": [
        61,
        197,
        55,
        28,
        159,
        18,
        132,
        128
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "participant"
        },
        {
          "name": "submission"
        },
        {
          "name": "scoreHash",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "submission"
              }
            ]
          }
        },
        {
          "name": "certificate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  101,
                  114,
                  116,
                  105,
                  102,
                  105,
                  99,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "submission"
              }
            ]
          }
        },
        {
          "name": "asset",
          "writable": true,
          "signer": true
        },
        {
          "name": "collection",
          "writable": true
        },
        {
          "name": "hackathon",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  97,
                  99,
                  107,
                  97,
                  116,
                  104,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "hackathon.organizer",
                "account": "hackathon"
              }
            ]
          }
        },
        {
          "name": "coreProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "metadataUri",
          "type": "string"
        },
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "scoreSubmission",
      "discriminator": [
        133,
        77,
        147,
        204,
        107,
        246,
        14,
        194
      ],
      "accounts": [
        {
          "name": "judge",
          "writable": true,
          "signer": true
        },
        {
          "name": "submission"
        },
        {
          "name": "hackathon"
        },
        {
          "name": "scoreHash",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "submission"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "systemScore",
          "type": "u8"
        },
        {
          "name": "judgeScore",
          "type": "u8"
        },
        {
          "name": "ipfsCid",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "certificate",
      "discriminator": [
        202,
        229,
        222,
        220,
        116,
        20,
        74,
        67
      ]
    },
    {
      "name": "hackathon",
      "discriminator": [
        180,
        85,
        208,
        43,
        178,
        243,
        204,
        107
      ]
    },
    {
      "name": "scoreHash",
      "discriminator": [
        130,
        77,
        164,
        209,
        103,
        63,
        249,
        239
      ]
    },
    {
      "name": "submission",
      "discriminator": [
        58,
        194,
        159,
        158,
        75,
        102,
        178,
        197
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidScore",
      "msg": "Score must be between 0 and 100"
    },
    {
      "code": 6001,
      "name": "scoreTooLow",
      "msg": "Score is too low to receive a certificate"
    },
    {
      "code": 6002,
      "name": "hackathonInactive",
      "msg": "The hackathon is no longer active"
    },
    {
      "code": 6003,
      "name": "hackathonNotFinalized",
      "msg": "The hackathon results must be finalized before issuing certificates"
    }
  ],
  "types": [
    {
      "name": "certificate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "submissionId",
            "type": "pubkey"
          },
          {
            "name": "metadataUri",
            "type": "string"
          },
          {
            "name": "mintedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "hackathon",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organizer",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "isActive",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "scoreHash",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "submissionId",
            "type": "pubkey"
          },
          {
            "name": "systemScore",
            "type": "u8"
          },
          {
            "name": "judgeScore",
            "type": "u8"
          },
          {
            "name": "finalScore",
            "type": "u8"
          },
          {
            "name": "ipfsCid",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "submission",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hackathonId",
            "type": "pubkey"
          },
          {
            "name": "participantWallet",
            "type": "pubkey"
          },
          {
            "name": "problemId",
            "type": "string"
          },
          {
            "name": "repoUrl",
            "type": "string"
          },
          {
            "name": "deploymentUrl",
            "type": "string"
          }
        ]
      }
    }
  ]
};
