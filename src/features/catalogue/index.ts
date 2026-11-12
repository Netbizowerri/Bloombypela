export { catalogueRepository } from './repository';
export { selectFeaturedProducts } from './featured';
export {
  JUICE_PACK_FORMATS,
  JUICE_PACK_FORMAT_LIST,
  detectJuicePackFormat,
  type JuicePackFormat,
  type JuicePackPreset,
} from './packs';
export type { ProductQueryOptions } from './hooks';
export {
  useProduct,
  useProducts,
  useBundles,
  usePlans,
  type CatalogueItemResult,
  type CatalogueListResult,
} from './hooks';
