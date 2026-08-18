// Stubs for the image-generation domain layer, shared by every suite that
// mounts the editor's Generate panel.
//
// Without them a test reaches the REAL deployed Edge Function and the REAL
// credits tables: the run becomes network-dependent, and a contract change on
// the server shows up as a mystery failure in an unrelated test. Anything the
// panel calls on mount — capabilities, estimate, balance — belongs here.

export const TEST_CAPABILITIES = {
  models: [{
    id: 'pollinations:flux', vendor: 'pollinations', tier: 'free', available: true,
    caps: {
      supportsReferenceImages: true, maxReferenceImages: 4,
      supportedAspectRatios: ['1:1', '4:5', '16:9'], supportedSizes: [1024],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
      supportsCancellation: true, supportsSeed: true, supportsNegativePrompt: true,
      supportsImageToImage: true, textRendering: 'weak',
    },
  }],
  auto: 'pollinations:flux',
  pricingVersion: 'test',
  usdPerCredit: 0.01,
};

export const TEST_ESTIMATE = {
  model: 'pollinations:flux',
  settings: { aspectRatio: '1:1', size: 1024, quality: null, count: 1, maxReferences: 4 },
  credits: 3,
  usd: 0.03,
  usdPerCredit: 0.01,
  pricingVersion: 'test',
  adjustments: [],
};

export const TEST_CREDIT_ACCOUNT = {
  workspaceId: 'ws-test',
  balance: 500,
  reserved: 0,
  lifetimeSpent: 0,
};

/** Everything the panel calls on the barrel. Spread over the real module. */
export function imageGenerationBarrelStubs() {
  return {
    fetchImageCapabilities: async () => TEST_CAPABILITIES,
    estimateGeneration: async () => TEST_ESTIMATE,
    cancelGeneration: async () => ({ job: {}, credits: { balance: 500, reserved: 0 } }),
  };
}

/** Everything `useCredits` calls on `./credits`. Spread over the real module. */
export function creditsModuleStubs() {
  return {
    resolveBillingWorkspace: async () => 'ws-test',
    getCreditAccount: async () => TEST_CREDIT_ACCOUNT,
    listCreditHistory: async () => [],
  };
}
