import crypto from 'crypto';

// ── In-memory key cache: generated once per server lifetime ──────
interface CachedKeyPair { publicKey: string; privateKey: string; }
const _keyCache = new Map<string, CachedKeyPair>();

export class CryptoService {
  /**
   * Generates a 1024-bit RSA key pair in PEM format.
   * Uses in-memory cache keyed by `tag` so generation only happens once.
   * 1024-bit is sufficient for demo/game purposes and is ~4x faster than 2048-bit.
   */
  static generateKeyPair(tag = 'default'): { publicKey: string; privateKey: string } {
    if (_keyCache.has(tag)) {
      return _keyCache.get(tag)!;
    }
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 1024,          // faster for demo: ~200ms vs ~800ms
      publicKeyEncoding:  { type: 'spki',  format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const pair = { publicKey, privateKey };
    _keyCache.set(tag, pair);
    return pair;
  }

  /** Pre-warm all key pairs so first game load is instant */
  static preWarmKeys(): void {
    const tags = ['player', 'bank', 'attacker'];
    console.log('[CRYPTO] Pre-warming RSA key cache...');
    const t0 = Date.now();
    tags.forEach(tag => CryptoService.generateKeyPair(tag));
    console.log(`[CRYPTO] Key cache ready in ${Date.now() - t0}ms`);
  }

  /**
   * Computes public key fingerprint (SHA-256 hash of the public key PEM, formatted as hex)
   */
  static getKeyFingerprint(publicKeyPem: string): string {
    const cleanKey = publicKeyPem
      .replace(/-----\s*BEGIN[^-]*-----/g, '')
      .replace(/-----\s*END[^-]*-----/g, '')
      .replace(/\s+/g, '');
    return crypto.createHash('sha256').update(cleanKey).digest('hex');
  }

  /**
   * Computes SHA-256 hash in hex
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Computes HMAC-SHA256 in hex
   */
  static hmac(key: string, data: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Signs data using RSA-SHA256 signature
   * Returns base64-encoded signature
   */
  static sign(privateKeyPem: string, data: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING, // Advanced secure padding
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      },
      'base64'
    );
  }

  /**
   * Verifies RSA-SHA256 signature
   */
  static verify(publicKeyPem: string, data: string, signatureBase64: string): boolean {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      return verify.verify(
        {
          key: publicKeyPem,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        },
        signatureBase64,
        'base64'
      );
    } catch (e) {
      console.error('[CRYPTO] Signature verification failed due to formatting error:', e);
      return false;
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * keyHex must be 64-char hex string (32 bytes)
   * Returns base64 ciphertext, iv, and tag
   */
  static encryptAES_GCM(
    keyHex: string,
    plaintext: string,
    aadString: string
  ): { ciphertext: string; iv: string; tag: string } {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12); // 96-bit IV is standard and safe for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    cipher.setAAD(Buffer.from(aadString, 'utf8'));

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const tag = cipher.getAuthTag().toString('base64');

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag,
    };
  }

  /**
   * Decrypts ciphertext using AES-256-GCM
   * Throws an error if decryption/tag verification fails
   */
  static decryptAES_GCM(
    keyHex: string,
    ciphertextB64: string,
    ivB64: string,
    tagB64: string,
    aadString: string
  ): string {
    const key = Buffer.from(keyHex, 'hex');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from(aadString, 'utf8'));

    let decrypted = decipher.update(ciphertextB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
