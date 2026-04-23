// Ambient declaration for CSS Modules imports. Consuming bundlers
// (Next/Turbopack, Vite, webpack + css-loader) all turn a
// `*.module.css` import into a classname map at build time.
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.css" {
  const content: string;
  export default content;
}
