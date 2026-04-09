import { describe, expect, it } from "vitest";
import {
  canTransitionStatus,
  normalizeCurrentStatusKey,
} from "../src/lib/commercial-offer-status.js";

describe("commercial-offer-status rules", () => {
  it("normalizes legacy approved status to waiting", () => {
    expect(normalizeCurrentStatusKey("proposal_approved")).toBe("proposal_waiting");
  });

  it("supports draft -> waiting transition", () => {
    expect(canTransitionStatus("proposal_draft", "proposal_waiting")).toBe(true);
  });

  it("rejects draft -> paid transition", () => {
    expect(canTransitionStatus("proposal_draft", "proposal_paid")).toBe(false);
  });

  it("allows no-op transition", () => {
    expect(canTransitionStatus("proposal_waiting", "proposal_waiting")).toBe(true);
  });
});
