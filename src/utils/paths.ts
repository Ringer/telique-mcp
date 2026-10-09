// Every Telique data path is `/v1/{service}/…`. Building them here keeps the
// version prefix in one place instead of in every tool.
export const API_PREFIX = "/v1";

export function apiPath(...segments: string[]): string {
  return [API_PREFIX, ...segments].join("/");
}
