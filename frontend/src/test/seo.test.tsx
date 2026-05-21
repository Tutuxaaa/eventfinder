import { render } from "@testing-library/react";
import { Seo } from "../components/Seo";

describe("Seo", () => {
  it("applies title, description and canonical", () => {
    render(<Seo title="Test title" description="Test description" canonicalPath="/discover" />);
    expect(document.title).toBe("Test title");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Test description");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toContain("/discover");
  });
});
