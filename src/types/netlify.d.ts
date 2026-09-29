declare const Netlify: {
  env: {
    get(name: string): string | undefined;
    has(name: string): boolean;
  };
};
