import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library の自動 cleanup は globals: true のときしか登録されない。
// globals を有効にせず vitest の API を明示 import する方針なので、ここで手動登録する。
afterEach(cleanup);
