// next の型定義は `*.module.css` しか宣言していない。
// 素のグローバル CSS（app/globals.css）の side-effect import は宣言が無いため、
// tsgo (TypeScript 7) が TS2882 "Cannot find module or type declarations for
// side-effect import" で弾く。tsc 5.x は黙認していたが tsgo は許さないので明示する。
declare module "*.css";
