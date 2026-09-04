import { createHash, X509Certificate } from "crypto";
import { inflateRawSync } from "zlib";

const EOCD_SIG = 0x06054b50;
const APK_SIG_BLOCK_MAGIC = Buffer.from("APK Sig Block 42");
const APK_SIGNATURE_SCHEME_V2_BLOCK_ID = 0x7109871a;
const APK_SIGNATURE_SCHEME_V3_BLOCK_ID = 0xf05368c0;

export class ApkSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApkSignatureError";
  }
}

/** URL-safe Base64 without '=' padding — Android Enterprise QR format. */
export function sha256DigestBase64Url(bytes: Buffer): string {
  return createHash("sha256")
    .update(bytes)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readU32LE(buf: Buffer, offset: number): number {
  if (offset < 0 || offset + 4 > buf.length) {
    throw new ApkSignatureError("APK truncated while reading u32");
  }
  return buf.readUInt32LE(offset);
}

function readU64LEAsNumber(buf: Buffer, offset: number): number {
  if (offset < 0 || offset + 8 > buf.length) {
    throw new ApkSignatureError("APK truncated while reading u64");
  }
  const lo = buf.readUInt32LE(offset);
  const hi = buf.readUInt32LE(offset + 4);
  if (hi > 0xffff) {
    throw new ApkSignatureError("APK section larger than supported");
  }
  return hi * 0x100000000 + lo;
}

function findEocdOffset(apk: Buffer): number {
  // EOCD is at the end; comment length can be up to 0xffff.
  const min = Math.max(0, apk.length - 22 - 0xffff);
  for (let i = apk.length - 22; i >= min; i -= 1) {
    if (readU32LE(apk, i) === EOCD_SIG) {
      const commentLen = apk.readUInt16LE(i + 20);
      if (i + 22 + commentLen === apk.length) return i;
    }
  }
  throw new ApkSignatureError("APK is missing End of Central Directory");
}

function sliceLengthPrefixed(buf: Buffer, offset: number): {
  value: Buffer;
  next: number;
} {
  const length = readU32LE(buf, offset);
  const start = offset + 4;
  const end = start + length;
  if (end > buf.length) {
    throw new ApkSignatureError("Length-prefixed field overflows buffer");
  }
  return { value: buf.subarray(start, end), next: end };
}

function findApkSigningBlock(apk: Buffer, centralDirOffset: number): Buffer {
  if (centralDirOffset < 32) {
    throw new ApkSignatureError("Central directory offset too small for signing block");
  }
  const footerOffset = centralDirOffset - 24;
  const magic = apk.subarray(footerOffset + 8, footerOffset + 24);
  if (!magic.equals(APK_SIG_BLOCK_MAGIC)) {
    throw new ApkSignatureError("APK Signing Block magic not found (v1-only APK?)");
  }
  const blockSizeInFooter = readU64LEAsNumber(apk, footerOffset);
  const blockStart = centralDirOffset - blockSizeInFooter - 8;
  if (blockStart < 0) {
    throw new ApkSignatureError("APK Signing Block start is invalid");
  }
  const blockSizeInHeader = readU64LEAsNumber(apk, blockStart);
  if (blockSizeInHeader !== blockSizeInFooter) {
    throw new ApkSignatureError("APK Signing Block size mismatch");
  }
  return apk.subarray(blockStart, centralDirOffset);
}

function firstCertFromSchemeBlock(blockValue: Buffer): Buffer | null {
  // signers (length-prefixed sequence)
  const signers = sliceLengthPrefixed(blockValue, 0).value;
  if (signers.length === 0) return null;
  const firstSigner = sliceLengthPrefixed(signers, 0).value;
  // signedData | signatures | publicKey
  const signedData = sliceLengthPrefixed(firstSigner, 0).value;
  // digests | certificates | (v3: min/max SDK ...)
  let offset = 0;
  offset = sliceLengthPrefixed(signedData, offset).next; // digests
  const certificates = sliceLengthPrefixed(signedData, offset).value;
  if (certificates.length === 0) return null;
  return sliceLengthPrefixed(certificates, 0).value;
}

function extractCertFromSigningBlock(apk: Buffer): Buffer {
  const eocd = findEocdOffset(apk);
  const centralDirOffset = readU32LE(apk, eocd + 16);
  const signingBlock = findApkSigningBlock(apk, centralDirOffset);
  const pairsEnd = signingBlock.length - 24;
  let offset = 8; // skip leading size
  let cert: Buffer | null = null;

  while (offset + 12 <= pairsEnd) {
    const pairLen = readU64LEAsNumber(signingBlock, offset);
    const id = readU32LE(signingBlock, offset + 8);
    const valueStart = offset + 12;
    const valueEnd = offset + 8 + pairLen;
    if (valueEnd > pairsEnd || valueEnd < valueStart) {
      throw new ApkSignatureError("Corrupt APK Signing Block pair");
    }
    const value = signingBlock.subarray(valueStart, valueEnd);
    if (
      id === APK_SIGNATURE_SCHEME_V2_BLOCK_ID ||
      id === APK_SIGNATURE_SCHEME_V3_BLOCK_ID
    ) {
      cert = firstCertFromSchemeBlock(value);
      if (cert) break;
    }
    offset = valueEnd;
  }

  if (!cert || cert.length === 0) {
    throw new ApkSignatureError("No signing certificate found in APK Signing Block");
  }
  return cert;
}

/** Minimal ZIP local-file walk for META-INF/*.{RSA,DSA,EC}. */
function extractPkcs7FromMetaInf(apk: Buffer): Buffer | null {
  let offset = 0;
  while (offset + 30 <= apk.length) {
    const sig = readU32LE(apk, offset);
    if (sig === EOCD_SIG || sig === 0x02014b50) break; // EOCD or central dir
    if (sig !== 0x04034b50) break; // local file header

    const compression = apk.readUInt16LE(offset + 8);
    const compSize = readU32LE(apk, offset + 18);
    const nameLen = apk.readUInt16LE(offset + 26);
    const extraLen = apk.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLen;
    const dataStart = nameEnd + extraLen;
    const dataEnd = dataStart + compSize;
    if (nameEnd > apk.length || dataEnd > apk.length) break;

    const name = apk.subarray(nameStart, nameEnd).toString("utf8");
    if (/^META-INF\/.+\.(RSA|DSA|EC)$/i.test(name) && compSize > 0) {
      const raw = apk.subarray(dataStart, dataEnd);
      if (compression === 0) return Buffer.from(raw);
      if (compression === 8) {
        try {
          return inflateRawSync(raw);
        } catch {
          /* try next entry */
        }
      }
    }
    offset = dataEnd;
  }
  return null;
}

/**
 * Walk DER looking for the first X.509 certificate SEQUENCE.
 * Used for v1 META-INF PKCS#7 blobs without a full ASN.1 library.
 */
function findFirstX509CertDer(pkcs7: Buffer): Buffer | null {
  for (let i = 0; i < pkcs7.length - 4; i += 1) {
    if (pkcs7[i] !== 0x30) continue;
    let len = pkcs7[i + 1];
    let header = 2;
    if (len === 0x82) {
      len = (pkcs7[i + 2] << 8) | pkcs7[i + 3];
      header = 4;
    } else if (len === 0x81) {
      len = pkcs7[i + 2];
      header = 3;
    } else if (len & 0x80) {
      continue;
    }
    const end = i + header + len;
    if (len < 64 || end > pkcs7.length) continue;
    const candidate = pkcs7.subarray(i, end);
    try {
      // Throws if not a certificate.
      new X509Certificate(candidate);
      return Buffer.from(candidate);
    } catch {
      /* keep scanning */
    }
  }
  return null;
}

function extractCertFromV1MetaInf(apk: Buffer): Buffer {
  const pkcs7 = extractPkcs7FromMetaInf(apk);
  if (!pkcs7) {
    throw new ApkSignatureError("No META-INF signature block found");
  }
  const cert = findFirstX509CertDer(pkcs7);
  if (!cert) {
    throw new ApkSignatureError("Could not parse X.509 cert from META-INF PKCS#7");
  }
  return cert;
}

/**
 * Extract the first APK signing certificate DER (v2/v3 block, else v1 META-INF).
 */
export function extractApkSigningCertDer(apk: Buffer): Buffer {
  if (apk.length < 4 || apk[0] !== 0x50 || apk[1] !== 0x4b) {
    throw new ApkSignatureError("Buffer is not a ZIP/APK");
  }
  try {
    return extractCertFromSigningBlock(apk);
  } catch (v2Error) {
    try {
      return extractCertFromV1MetaInf(apk);
    } catch (v1Error) {
      const v2Msg = v2Error instanceof Error ? v2Error.message : String(v2Error);
      const v1Msg = v1Error instanceof Error ? v1Error.message : String(v1Error);
      throw new ApkSignatureError(
        `Unable to extract APK signing certificate (${v2Msg}; ${v1Msg})`
      );
    }
  }
}

/**
 * Android Enterprise SIGNATURE_CHECKSUM:
 * SHA-256 of the APK signing certificate (DER), URL-safe Base64, no padding.
 * Equivalent to: apksigner verify --print-certs | SHA-256 digest → base64url
 */
export function signatureChecksumFromApk(apk: Buffer): string {
  const certDer = extractApkSigningCertDer(apk);
  return sha256DigestBase64Url(certDer);
}
