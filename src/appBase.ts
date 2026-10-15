// Vite supplies the root or project subdirectory used by this deployment.
export const appBase=(import.meta as ImportMeta & {env:Record<string,string>}).env.BASE_URL;
