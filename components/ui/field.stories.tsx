import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Button } from "./button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "./field";
import { Input } from "./input";

const meta = {
  component: Field,
  tags: ["ai-generated"],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** フォームの並びは div + gap ではなく FieldGroup + Field で作る */
export const Default: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="handle">handle</FieldLabel>
        <Input id="handle" placeholder="yourname" />
        <FieldDescription>英小文字・数字・アンダースコアの2〜20文字。</FieldDescription>
      </Field>
    </FieldGroup>
  ),
};

/**
 * 不正な入力。Field に data-invalid、コントロールに aria-invalid を
 * 両方付けるのが決まり。片方だけだと色か読み上げのどちらかが落ちる。
 */
export const Invalid: Story = {
  render: () => (
    <FieldGroup>
      <Field data-invalid="true">
        <FieldLabel htmlFor="handle-invalid">handle</FieldLabel>
        <Input aria-invalid defaultValue="hoshino" id="handle-invalid" />
        <FieldDescription>英小文字・数字・アンダースコアの2〜20文字。</FieldDescription>
        <FieldError>@hoshino はすでに使われています</FieldError>
      </Field>
    </FieldGroup>
  ),
  play: async ({ canvas }) => {
    const error = canvas.getByText("@hoshino はすでに使われています");
    await expect(error).toHaveAttribute("role", "alert");
    await expect(canvas.getByLabelText("handle")).toHaveAttribute("aria-invalid", "true");
  },
};

/** 検索バーがこの形。入力とボタンを横に並べる */
export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Input aria-label="検索語" className="h-9 flex-1" placeholder="端点をひとつ" />
      <Button size="lg">検索</Button>
    </Field>
  ),
};

export const Disabled: Story = {
  render: () => (
    <FieldGroup>
      <Field data-disabled="true">
        <FieldLabel htmlFor="handle-disabled">handle</FieldLabel>
        <Input disabled id="handle-disabled" defaultValue="hoshino" />
        <FieldDescription>一度決めると変更できません。</FieldDescription>
      </Field>
    </FieldGroup>
  ),
};

export const WithSeparator: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="a">handle</FieldLabel>
        <Input id="a" placeholder="yourname" />
      </Field>
      <FieldSeparator>または</FieldSeparator>
      <Field>
        <FieldLabel htmlFor="b">ラベル</FieldLabel>
        <Input id="b" placeholder="laptop の Claude Code" />
      </Field>
    </FieldGroup>
  ),
};
