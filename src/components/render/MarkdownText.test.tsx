// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownText } from "./MarkdownText";

describe("MarkdownText", () => {
  it("renders default block wrapper", () => {
    const { container } = render(
      React.createElement(MarkdownText, { content: "Hello **World**" }),
    );

    const wrapper = container.querySelector(".markdown-content");
    expect(wrapper).toBeTruthy();
    expect(screen.getByText("World").tagName.toLowerCase()).toBe("strong");
  });

  it("renders inline wrapper when inline=true", () => {
    const { container } = render(
      React.createElement(MarkdownText, {
        content: "Inline text",
        inline: true,
        className: "inline-class",
      }),
    );

    const wrapper = container.querySelector(
      ".markdown-content-inline.inline-class",
    );
    expect(wrapper).toBeTruthy();
  });

  it("applies configured indent class to paragraphs", () => {
    const { container } = render(
      React.createElement(MarkdownText, {
        content: "Paragraph text",
        indentSize: 2,
      }),
    );

    const paragraph = container.querySelector("p");
    expect(paragraph?.className).toContain("indent-2");
  });

  it("removes indent class when disableIndent is true", () => {
    const { container } = render(
      React.createElement(MarkdownText, {
        content: "No indent",
        disableIndent: true,
      }),
    );

    const paragraph = container.querySelector("p");
    expect(paragraph?.className).not.toContain("indent-");
  });

  it("merges default, external and custom component class names", () => {
    const CustomParagraph = ({ className, children }: any) =>
      React.createElement(
        "p",
        { "data-testid": "custom-p", className },
        children,
      );

    render(
      React.createElement(MarkdownText, {
        content: "Merged classes",
        className: "outer-class",
        components: {
          p: (props: any) =>
            React.createElement(CustomParagraph, {
              ...props,
              className: `${props.className} custom-class`,
            }),
        },
      }),
    );

    const paragraph = screen.getByTestId("custom-p");
    expect(paragraph.className).toContain("indent-8");
    expect(paragraph.className).toContain("outer-class");
    expect(paragraph.className).toContain("custom-class");
  });
});
