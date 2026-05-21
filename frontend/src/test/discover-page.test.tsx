import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { publicApi } from "../api";
import { DiscoverPage } from "../components/DiscoverPage";

vi.mock("../api", () => ({
  publicApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Test Event",
          date: "2026-04-25T18:00:00+00:00",
          location: "Vilnius",
          price: "Free",
          category: "Концерты",
          owner_id: 1,
          description: "Demo",
          image_url: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 12,
      total_pages: 1,
    }),
  },
  mapEventToCard: (event: any) => ({
    id: String(event.id),
    title: event.title,
    date: "25.04.2026",
    time: "18:00",
    location: event.location,
    price: event.price,
    category: event.category,
    image: "https://example.com/test.jpg",
    description: event.description,
  }),
}));

describe("DiscoverPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders public event card", async () => {
    render(
      <MemoryRouter>
        <DiscoverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });
  });

  it("passes filter state from query params to API", async () => {
    render(
      <MemoryRouter initialEntries={["/discover?q=jazz&category=Концерты&location=Vilnius&sort_by=title&sort_order=desc&page=2"]}>
        <DiscoverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(publicApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "jazz",
          category: "Концерты",
          location: "Vilnius",
          sort_by: "title",
          sort_order: "desc",
          page: 2,
          page_size: 12,
        }),
      );
    });
  });

  it("applies typed filters through query params", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DiscoverPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Поиск"), "jazz");
    await user.type(screen.getByLabelText("Локация"), "Vilnius");
    await user.click(screen.getByRole("button", { name: "Применить фильтры" }));

    await waitFor(() => {
      expect(publicApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: "jazz", location: "Vilnius", page: 1 }));
    });
  });
});
