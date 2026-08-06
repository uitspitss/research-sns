import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },

  // app/layout.tsx の .shell と同じ幅・余白に収める。
  // 経路や見出しは 660px の中でどう折り返すかが本番と同じでないと意味がないため。
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[660px] px-6 py-6">
        <Story />
      </div>
    ),
  ],
};

export default preview;
