import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import ManageAssetsView from "@/app/admin/components/NewManageAssets";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/app/admin/page";
import { filterAssets } from "@/app/home/page";
import { AssetRow } from "@/app/types";
import { waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

test("opens create asset panel when button is clicked", () => {
  render(<ManageAssetsView />);

  // click the button that opens the panel
  fireEvent.click(screen.getByText(/Add New Asset/i));

  // now check if panel content exists
  expect(screen.getByText(/Create New Asset/i)).toBeInTheDocument();
});

global.EventSource = jest.fn(() => ({
  close: jest.fn(),
  onmessage: null,
})) as any;

test("navigates back to home when button is clicked", () => {
  const pushMock = jest.fn();

  (useRouter as jest.Mock).mockReturnValue({
    push: pushMock,
    replace: jest.fn(),
    prefetch: jest.fn(),
  });

  render(<AdminDashboard />);

  fireEvent.click(screen.getByRole("button", { name: /back to home/i }));

  expect(pushMock).toHaveBeenCalledWith("/home");
});

const mockAssets: AssetRow[] = [
  {
    id: "1",
    name: "Laptop A",
    location: "Office",
    rentedOut: false,
    rentedTo: null,
    rentedOutAt: null,
    description: "Basic office laptop",
  },
  {
    id: "2",
    name: "Laptop B",
    location: "Warehouse",
    rentedOut: true,
    rentedTo: "Alice",
    rentedOutAt: "2026-01-01",
    description: "High performance laptop",
  },
  {
    id: "3",
    name: "Projector",
    location: "Meeting Room",
    rentedOut: true,
    rentedTo: "Bob",
    rentedOutAt: "2026-01-02",
    description: "4K projector",
  },
];

describe("filterAssets", () => {
  test("returns all assets when search is empty and onlyRentedOut is false", () => {
    const result = filterAssets(mockAssets, "", false);
    expect(result).toHaveLength(3);
  });

  test("filters only rented out assets when onlyRentedOut is true", () => {
    const result = filterAssets(mockAssets, "", true);

    expect(result).toHaveLength(2);
    expect(result.every((a) => a.rentedOut)).toBe(true);
  });

  test("filters by name (case insensitive)", () => {
    const result = filterAssets(mockAssets, "laptop a", false);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Laptop A");
  });

  test("filters by location", () => {
    const result = filterAssets(mockAssets, "warehouse", false);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Laptop B");
  });

  test("search includes rentedTo field", () => {
    const result = filterAssets(mockAssets, "alice", false);

    expect(result).toHaveLength(1);
    expect(result[0].rentedTo).toBe("Alice");
  });

  test("trims whitespace in search query", () => {
    const result = filterAssets(mockAssets, "  projector  ", false);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Projector");
  });

  test("combines rented filter and search filter", () => {
    const result = filterAssets(mockAssets, "laptop", true);

    // only rented laptops should remain
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Laptop B");
  });

  test("returns empty array when nothing matches", () => {
    const result = filterAssets(mockAssets, "nonexistent", false);

    expect(result).toHaveLength(0);
  });
});

test("opens Manage asset panel when button is clicked", () => {
  render(<AdminDashboard />);

  // click the button that opens the panel
  const assetsButton = screen.getByRole("button", { name: /assets/i });
  fireEvent.click(assetsButton);
  // now check if panel content exists
  expect(screen.getByText(/Asset Management/i)).toBeInTheDocument();
});

global.fetch = jest.fn((url) => {
  if (url.includes("/api/assets/get")) {
    return Promise.resolve({
      ok: true,
      json: async () => [
        {
          id: "1",
          name: "Laptop",
          category_id: "100",
          lab_id: "200",
          description: "test",
          location: "EE 102",
          serial_number: "123",
        },
      ],
    });
  }

  if (url.includes("/api/categories/get")) {
    return Promise.resolve({
      ok: true,
      json: async () => [{ id: "100", name: "tech" }],
    });
  }

  if (url.includes("/api/labs/get")) {
    return Promise.resolve({
      ok: true,
      json: async () => [{ id: "200", name: "lab 102" }],
    });
  }

  return Promise.resolve({
    ok: true,
    json: async () => [],
  });
}) as jest.Mock;

test("Does edit button open the edit panel when clicked", async () => {
  render(<ManageAssetsView />);
  const editAssetsButton = await screen.findByRole("button", {
    name: /edit asset/i,
  });
  fireEvent.click(editAssetsButton);
  expect(screen.getByText(/EE 102/i)).toBeInTheDocument();
});

test("Remove button removes asset from page when clicked", async () => {
  render(<ManageAssetsView />);
  const removeAssetsButton = await screen.findByRole("button", {
    name: /remove asset/i,
  });
  fireEvent.click(removeAssetsButton);
  await waitFor(() => {
    expect(screen.queryByText(/Laptop/i)).not.toBeInTheDocument();
  });
});
