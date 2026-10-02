import { ProductPresentationSchema } from '../../contracts/src/index.js';

// Fictional Product Pack: presentation only in P0. No objects/actions/workflows.
export const acmePresentation = ProductPresentationSchema.parse({
  packId: 'acme-quality-cloud',
  name: 'Acme Quality Cloud',
  description: 'A fictional Synthetic Product Twin for the GDE foundation.',
  fictional: true,
});
