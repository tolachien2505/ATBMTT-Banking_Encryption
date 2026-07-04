import { query } from '../../config/db';
import { CryptoService } from '../crypto/crypto.service';
import crypto from 'crypto';
import { TransactionEnvelopeInput } from '../transactions/validator.service';

// ── Server-lifetime key cache (survives across requests) ──────────
let _cachedKeys: { playerKey: any; bankKey: any; attackerKey: any; symKey: any } | null = null;

export class GameService {
  /**
   * Generates or fetches keys for a user and level.
   * Result is cached in memory — RSA key generation only runs ONCE per server start.
   */
  static async getOrCreateKeys(): Promise<{ playerKey: any; bankKey: any; attackerKey: any; symKey: any }> {
    // Return cached result immediately if available
    if (_cachedKeys) return _cachedKeys;
    // Check if key database already contains proper cryptographic keys
    const keys = await query('SELECT * FROM crypto_keysets');
    
    let playerKey = keys.find((k: any) => k.key_id === 'key_player_2026');
    let bankKey = keys.find((k: any) => k.key_id === 'key_bank_2026');
    let attackerKey = keys.find((k: any) => k.key_id === 'key_attacker_2026');
    let symKey = keys.find((k: any) => k.key_id === 'key_symmetric_2026');

    let rogueKey = keys.find((k: any) => k.key_id === 'key_rogue_symmetric_2026');
    if (!rogueKey) {
      console.log('[GAME] Seeding rogue symmetric key keyset entry...');
      await query(
        'INSERT INTO crypto_keysets (key_id, owner_type, purpose, algorithm, public_key_pem, key_fingerprint, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['key_rogue_symmetric_2026', 'ATTACKER', 'ENCRYPTION', 'AES-256-GCM', null, 'rogue_symmetric_key_fingerprint_2026', 'REVOKED']
      );
    }

    if (!playerKey || !bankKey || !attackerKey || !symKey) {
      console.log('[GAME] Generating RSA key pairs (1024-bit, cached) ...');
      
      // Use tagged cache — each tag generates only once per server lifetime
      const pPair = CryptoService.generateKeyPair('player');
      const bPair = CryptoService.generateKeyPair('bank');
      const aPair = CryptoService.generateKeyPair('attacker');
      const sKey = crypto.randomBytes(32).toString('hex');

      // Write Player Key
      const pId = 'key_player_2026';
      await query(
        'INSERT INTO crypto_keysets (key_id, owner_type, purpose, algorithm, public_key_pem, key_fingerprint, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [pId, 'PLAYER', 'SIGNING', 'RSA-PSS', pPair.publicKey, CryptoService.getKeyFingerprint(pPair.publicKey), 'ACTIVE']
      );
      await query('UPDATE crypto_keysets SET owner_id = ? WHERE key_id = ?', [pPair.privateKey, pId]);

      // Write Bank Key
      const bId = 'key_bank_2026';
      await query(
        'INSERT INTO crypto_keysets (key_id, owner_type, purpose, algorithm, public_key_pem, key_fingerprint, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [bId, 'BANK', 'SIGNING', 'RSA-PSS', bPair.publicKey, CryptoService.getKeyFingerprint(bPair.publicKey), 'ACTIVE']
      );

      // Write Attacker Key
      const aId = 'key_attacker_2026';
      await query(
        'INSERT INTO crypto_keysets (key_id, owner_type, purpose, algorithm, public_key_pem, key_fingerprint, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [aId, 'ATTACKER', 'SIGNING', 'RSA-PSS', aPair.publicKey, CryptoService.getKeyFingerprint(aPair.publicKey), 'ACTIVE']
      );
      await query('UPDATE crypto_keysets SET owner_id = ? WHERE key_id = ?', [aPair.privateKey, aId]);

      // Write Symmetric Key
      const sId = 'key_symmetric_2026';
      await query(
        'INSERT INTO crypto_keysets (key_id, owner_type, purpose, algorithm, public_key_pem, key_fingerprint, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sId, 'SYSTEM', 'ENCRYPTION', 'AES-256-GCM', null, sKey, 'ACTIVE']
      );

      // Refetch
      const newKeys = await query('SELECT * FROM crypto_keysets');
      playerKey = newKeys.find((k: any) => k.owner_type === 'PLAYER');
      bankKey = newKeys.find((k: any) => k.owner_type === 'BANK');
      attackerKey = newKeys.find((k: any) => k.owner_type === 'ATTACKER');
      symKey = newKeys.find((k: any) => k.purpose === 'ENCRYPTION');
    }

    // Cache result for subsequent requests
    _cachedKeys = { playerKey, bankKey, attackerKey, symKey };
    return _cachedKeys;
  }

  /**
   * Begins a game level, creates simulated transaction data and registers state
   */
  static async startLevel(levelId: string, sessionId: string): Promise<any> {
    const levels = await query('SELECT * FROM levels WHERE level_id = ?', [levelId]);
    if (levels.length === 0) {
      throw new Error(`Level ${levelId} not found.`);
    }
    const level = levels[0];

    const { playerKey, bankKey, symKey } = await this.getOrCreateKeys();

    // Create Draft Transaction
    const txId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    // Demo transaction balances
    const fromAcc = 'acc_alice_demo';
    const toAcc = 'acc_bob_demo';
    const originalAmount = 1000000; // 1,000,000 VND
    
    // Attacker modifies submitted amount in DB directly for level 2 simulation
    const submittedAmount = level.attack_type === 'AMOUNT_TAMPERING' ? 100000000 : originalAmount;

    await query(
      'INSERT INTO transactions (tx_id, session_id, level_id, from_account_id, to_account_id, original_amount, submitted_amount, currency, memo, tx_status, attack_type, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        txId,
        sessionId,
        levelId,
        fromAcc,
        toAcc,
        originalAmount,
        submittedAmount,
        'VND',
        `Chuyển tiền màn chơi: ${level.title}`,
        'DRAFT',
        level.attack_type,
        expiresAt,
      ]
    );

    // Build Original Payload
    const payload = {
      tx_id: txId,
      from_account: 'CB-1001-ALICE',
      to_account: 'CB-2002-BOB',
      amount: originalAmount,
      currency: 'VND',
      memo: `Chuyển tiền màn chơi: ${level.title}`,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      session_id: sessionId,
      message_id: `msg_${crypto.randomBytes(8).toString('hex')}`,
      nonce: crypto.randomBytes(12).toString('base64url'),
      sequence_no: 1,
    };

    // Construct Canonical JSON Hash & Signature
    const canonicalStr = JSON.stringify(payload);
    const payloadHash = CryptoService.hash(canonicalStr);
    
    // Fetch Private Key saved in db temporarily as owner_id
    const playerPrivateKey = playerKey.owner_id || '';
    const signature = CryptoService.sign(playerPrivateKey, payloadHash);

    // Construct AES-GCM Ciphertext
    // We use symKey fingerprint (which holds the random 256-bit symmetric key) to encrypt
    let rawKeyHex = symKey.key_fingerprint;
    if (rawKeyHex.length < 64) rawKeyHex = rawKeyHex.padEnd(64, '0');
    else if (rawKeyHex.length > 64) rawKeyHex = rawKeyHex.substring(0, 64);

    const aad = {
      tx_id: txId,
      session_id: sessionId,
      message_id: payload.message_id,
      sequence_no: 1,
    };
    const ivBytes = crypto.randomBytes(12).toString('base64');
    const encryptResult = CryptoService.encryptAES_GCM(rawKeyHex, canonicalStr, JSON.stringify(aad));

    const envelope: TransactionEnvelopeInput = {
      version: '2.0',
      message_id: payload.message_id,
      nonce_hash: CryptoService.hash(payload.nonce),
      sequence_no: 1,
      tx_timestamp: payload.created_at,
      session_binding: CryptoService.hash(sessionId + payload.message_id),
      aad,
      public_payload: payload, // Holds raw unencrypted payload for levels without encryption
      ciphertext_b64: encryptResult.ciphertext,
      tag_b64: encryptResult.tag,
      payload_hash: payloadHash,
      signature_b64: signature,
      signer_key_id: playerKey.key_id,
      encryption_key_id: symKey.key_id,
      algorithm: {
        aead: 'AES-256-GCM',
        signature: 'RSA-PSS',
        hash: 'SHA-256',
        iv: encryptResult.iv,
      },
    };

    // Get level defense cards
    const defenseOptions = await query(
      'SELECT d.*, l.is_required, l.is_correct, l.hint_text FROM defense_options d JOIN level_defense_options l ON l.defense_id = d.defense_id WHERE l.level_id = ?',
      [levelId]
    );

    return {
      tx_id: txId,
      level,
      payload,
      envelope,
      defenseOptions,
      keys: {
        player_public_key: playerKey.public_key_pem,
        player_key_id: playerKey.key_id,
        player_fingerprint: playerKey.key_fingerprint,
        bank_public_key: bankKey.public_key_pem,
        bank_key_id: bankKey.key_id,
        symmetric_key_id: symKey.key_id,
      },
    };
  }

  /**
   * Applies the attack from AttackerBot to the envelope based on level configs
   */
  static async applyAttack(
    levelId: string,
    envelope: TransactionEnvelopeInput,
    submittedAmount: number
  ): Promise<TransactionEnvelopeInput> {
    const levelRes = await query('SELECT * FROM levels WHERE level_id = ?', [levelId]);
    if (levelRes.length === 0) return envelope;
    const level = levelRes[0];

    const attackedEnvelope = JSON.parse(JSON.stringify(envelope)) as TransactionEnvelopeInput;

    if (level.attack_type === 'AMOUNT_TAMPERING') {
      // Attacker intercepts and alters the amount inside the public_payload
      if (attackedEnvelope.public_payload) {
        attackedEnvelope.public_payload.amount = submittedAmount;
      }
      // Re-hash but DO NOT re-sign, simulating a forged/tampered packet
      const tamperedCanonical = JSON.stringify(attackedEnvelope.public_payload);
      attackedEnvelope.payload_hash = CryptoService.hash(tamperedCanonical);
      // Ciphertext is NOT modified because attacker doesn't have the AES key! 
      // This is perfect! If AES-GCM is verified, GCM tag check will fail. 
      // If public_payload is verified via digital signature, signature verification will fail.
    } 
    else if (level.attack_type === 'REPLAY') {
      // Replay simulation: we use a static pre-captured valid message_id
      // to trigger the duplicate check in Validator.
      attackedEnvelope.message_id = 'msg_captured_replay_001';
      if (attackedEnvelope.public_payload) {
        attackedEnvelope.public_payload.message_id = 'msg_captured_replay_001';
      }
      attackedEnvelope.aad.message_id = 'msg_captured_replay_001';
    } 
    else if (level.attack_type === 'INVALID_SIGNATURE') {
      // Forged signature: attacker alters the signature_b64 value or signs it with rogue private key
      const { attackerKey } = await this.getOrCreateKeys();
      const attackerPrivateKey = attackerKey.owner_id || '';
      
      const canonicalData = JSON.stringify(attackedEnvelope.public_payload);
      const computedHash = CryptoService.hash(canonicalData);
      
      // Sign with Attacker Private Key instead of Player Private Key
      attackedEnvelope.signature_b64 = CryptoService.sign(attackerPrivateKey, computedHash);
      attackedEnvelope.signer_key_id = attackerKey.key_id; // Set signer key id to attacker key
    } 
    else if (level.attack_type === 'WRONG_KEY') {
      // Symmetric key is encrypted/tagged with a wrong key id
      attackedEnvelope.encryption_key_id = 'key_rogue_symmetric_2026';
    }
    else if (level.attack_type === 'EXPIRED_TRANSACTION') {
      // Set timestamp to 10 minutes ago
      const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      attackedEnvelope.tx_timestamp = pastTime;
      if (attackedEnvelope.public_payload) {
        attackedEnvelope.public_payload.created_at = pastTime;
      }
    }

    return attackedEnvelope;
  }
}
