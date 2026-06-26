import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import configuration from "./configuration";

describe("configuration via Nest ConfigService", () => {
  beforeEach(() => {
    process.env.PORT = "4567";
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
