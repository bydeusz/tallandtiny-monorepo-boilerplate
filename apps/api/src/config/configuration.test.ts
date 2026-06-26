import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import configuration from "./configuration";

describe("configuration via Nest ConfigService", () => {
  const originalPort = process.env.PORT;

  beforeEach(() => {
    process.env.PORT = "4567";
  });

  afterEach(() => {
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
  });

  it("exposes the http port through the DI container", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: [configuration], ignoreEnvFile: true }),
      ],
    }).compile();

    const config = moduleRef.get(ConfigService);
    expect(config.get<number>("port")).toBe(4567);
  });
});
