import { InstaloaderProvider, MockProvider, type InstagramProvider } from "./InstagramProvider";

class ProviderManager {
  readonly active: InstagramProvider;

  constructor() {
    const useMock = process.env.INSTAGRAM_PROVIDER === "mock" && process.env.NODE_ENV === "development";
    this.active = useMock ? new MockProvider() : new InstaloaderProvider();
  }
}

export const providerManager = new ProviderManager();
