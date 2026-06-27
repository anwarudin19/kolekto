export default () => ({
  upload: {
    maxSizeMb: Number(process.env.UPLOAD_MAX_SIZE_MB ?? 5),
    maxProofFiles: Number(process.env.UPLOAD_MAX_PROOF_FILES ?? 5),
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
});
