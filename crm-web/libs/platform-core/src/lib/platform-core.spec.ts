import { selectRepository } from './platform-core';

describe('selectRepository', () => {
  it('returns mock or http by api flag', () => {
    const mock = { kind: 'mock' as const };
    const http = { kind: 'http' as const };
    expect(
      selectRepository({
        apiConfig: { useMockRepositories: true },
        mockRepo: mock,
        httpRepo: http,
      }),
    ).toBe(mock);
    expect(
      selectRepository({
        apiConfig: { useMockRepositories: false },
        mockRepo: mock,
        httpRepo: http,
      }),
    ).toBe(http);
  });
});
