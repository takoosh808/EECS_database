import { describe, expect, it } from "vitest";
import { parseBarcode } from "../app/utils/barcode";

describe("parseBarcode", () => {
  it("parses serial and name when optional fields are omitted", () => {
    expect(parseBarcode(" WSU-002 | raspberry pi ")).toEqual({
      serialNumber: "WSU-002",
      name: "raspberry pi",
    });
  });

  it("parses all supplied trailing fields", () => {
    expect(
      parseBarcode("WSU-003|Oscilloscope|Engineering Lab|100 MHz scope"),
    ).toEqual({
      serialNumber: "WSU-003",
      name: "Oscilloscope",
      location: "Engineering Lab",
      description: "100 MHz scope",
    });
  });

  it("rejects an empty serial number", () => {
    expect(parseBarcode(" |raspberry pi")).toBeNull();
  });
});