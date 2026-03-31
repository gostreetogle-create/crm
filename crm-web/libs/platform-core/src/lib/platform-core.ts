/**
 * Picks repository implementation in one place for all features.
 * This keeps provider factories uniform and easy to refactor.
 */
export function selectRepository<TMockRepo, THttpRepo, TApiConfig extends { useMockRepositories: boolean }>(params: {
  apiConfig: TApiConfig;
  mockRepo: TMockRepo;
  httpRepo: THttpRepo;
}): TMockRepo | THttpRepo {
  return params.apiConfig.useMockRepositories ? params.mockRepo : params.httpRepo;
}
