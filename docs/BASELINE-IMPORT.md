# Complete v0.2 import

All 41 original vendor/reference asset files are included in `packed/` as checksummed base64 parts. These are transport encoding, **not** encryption, redaction or privacy protection. `node restore-assets.mjs` reconstructs byte-identical files and rejects checksum or path violations. This is necessary because the repository connection accepts text files, not arbitrary binary blobs.

The owner explicitly requested a complete public development repository after being informed that files and history remain copyable while public. Reference images are not automatically licensed for reuse by other people, and upstream body asset provenance still needs review before production/commercial use.

Validation performed from a newly assembled repository folder:

1. Restore 41 original asset files and verify individual SHA256 digests.
2. Build the complete offline v0.2 HTML with `npm run build`.
3. Run all six baseline geometry/validation tests with `npm test`.

Result: build and all six tests pass. No hosted deployment has been made. Baseline body circumferences remain uncalibrated; this is not a validated fitting system.
