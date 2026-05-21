import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

function DemoSelect() {
  const [value, setValue] = useState("date");

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Сортировка">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="date">По дате</SelectItem>
        <SelectItem value="created_at">По созданию</SelectItem>
        <SelectItem value="title">По названию</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("opens menu items and changes displayed label", async () => {
    const user = userEvent.setup();
    render(<DemoSelect />);

    await waitFor(() => {
      expect(screen.getByText("По дате")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /сортировка/i }));
    expect(screen.getByRole("option", { name: "По названию" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "По названию" }));
    expect(screen.getByRole("button", { name: /сортировка/i })).toHaveTextContent("По названию");
    expect(screen.queryByRole("option", { name: "По дате" })).not.toBeInTheDocument();
  });
});
