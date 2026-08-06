import type { NextConfig } from "next";

/**
 * 設定する項目は今のところない。空でも置いてあるのは、shadcn の CLI が
 * このファイルの有無でフレームワークを判定していて、無いと
 * `shadcn add` が「Next.js が見つからない」で止まるため。
 */
const nextConfig: NextConfig = {};

export default nextConfig;
