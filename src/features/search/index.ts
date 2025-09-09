// Export types
export type { 
  SearchFilters, 
  SearchResult, 
  AuthorResult, 
  SearchResponse, 
  SearchParams,
  SearchState,
  SortType,
  CategoryType,
  RatingType
} from './types';

// Export schemas
export { 
  SearchFiltersSchema, 
  SearchParamsSchema, 
  SearchQuerySchema 
} from './schemas';

// Export server functions
export { searchWorks } from './server/loader';
export { 
  executeSearch, 
  updateSearchFilters, 
  getSearchResults 
} from './server/actions';

// Export sections
export { SearchHeaderSection } from './sections/SearchHeaderSection';
export { SearchFiltersSection } from './sections/SearchFiltersSection';
export { SearchResultsSection } from './sections/SearchResultsSection';

// Export leaf components
export { FilterChips } from './leaf/FilterChips';
export { EmptyResults } from './leaf/EmptyResults';
export { ResultsPagination } from './leaf/ResultsPagination';
export { SearchInput } from './leaf/SearchInput';
export { SearchSuggestions } from './leaf/SearchSuggestions';
export { RelatedSearches } from './leaf/RelatedSearches';