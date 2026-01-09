import * as crypto from "crypto";

/**
 * GibberishAES 호환 암호화
 * Flow에서 사용하는 암호화 방식과 동일
 */
export function encryptPassword(password: string): string {
  // 랜덤 salt 생성 (8 바이트)
  const salt = crypto.randomBytes(8);

  // OpenSSL EVP_BytesToKey 방식으로 키와 IV 생성
  const { key, iv } = deriveKeyAndIV(password, salt);

  // AES-256-CBC 암호화
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);

  // "Salted__" + salt + encrypted 형태로 결합
  const result = Buffer.concat([
    Buffer.from("Salted__", "utf8"),
    salt,
    encrypted,
  ]);

  // Base64 인코딩
  return result.toString("base64") + "\n";
}

/**
 * OpenSSL EVP_BytesToKey 방식으로 키와 IV 생성
 * MD5 해시를 반복적으로 사용하여 키와 IV를 도출
 */
function deriveKeyAndIV(
  password: string,
  salt: Buffer,
): { key: Buffer; iv: Buffer } {
  const keySize = 32; // AES-256 키 크기
  const ivSize = 16; // AES IV 크기
  const targetLength = keySize + ivSize;

  let derived = Buffer.alloc(0);
  let previousHash = Buffer.alloc(0);

  while (derived.length < targetLength) {
    const hash = crypto.createHash("md5");
    hash.update(previousHash);
    hash.update(password, "utf8");
    hash.update(salt);
    previousHash = hash.digest();
    derived = Buffer.concat([derived, previousHash]);
  }

  return {
    key: derived.subarray(0, keySize),
    iv: derived.subarray(keySize, keySize + ivSize),
  };
}
