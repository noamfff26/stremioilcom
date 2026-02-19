import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  it("should merge single class name", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("should merge multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
  });

  it("should handle undefined and null values", () => {
    expect(cn("foo", undefined, "bar", null)).toBe("foo bar");
  });

  it("should merge tailwind classes correctly", () => {
    // twMerge should handle conflicting tailwind classes
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle object syntax", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
    expect(cn({ foo: true, bar: true })).toBe("foo bar");
  });

  it("should handle array syntax", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
    expect(cn(["foo", false && "bar", "baz"])).toBe("foo baz");
  });

  it("should handle mixed inputs", () => {
    expect(cn("foo", ["bar", "baz"], { qux: true })).toBe("foo bar baz qux");
  });

  it("should return empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("should handle empty strings", () => {
    expect(cn("", "foo", "")).toBe("foo");
  });

  it("should deduplicate tailwind modifiers", () => {
    expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe("hover:bg-blue-500");
  });

  it("should handle responsive classes", () => {
    expect(cn("md:text-lg", "md:text-xl")).toBe("md:text-xl");
    expect(cn("sm:p-4", "md:p-6", "lg:p-8")).toBe("sm:p-4 md:p-6 lg:p-8");
  });
});
