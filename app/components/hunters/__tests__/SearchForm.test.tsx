import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchForm from "@/app/components/hunters/SearchForm";

describe("SearchForm", () => {
  beforeEach(() => {
    // Mock /api/config/status — defaults to eBay configured, TikTok not
    global.fetch = vi.fn((url: string | URL | Request) => {
      if (String(url).includes("/api/config/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ebay: true, tiktok: false }),
        } as Response);
      }
      return Promise.reject(new Error("unexpected fetch"));
    }) as unknown as typeof fetch;
  });

  it("renders the core form fields", () => {
    render(<SearchForm onSubmit={async () => {}} />);
    expect(screen.getByPlaceholderText(/e\.g\. LeBron/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Filters$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Search These Marketplaces/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Price/i)).toBeInTheDocument();
  });

  it("disables submit when form is empty", () => {
    render(<SearchForm onSubmit={async () => {}} />);
    const submit = screen.getByRole("button", { name: /save/i });
    expect(submit).toBeDisabled();
  });

  it("requires at least 2 filters to submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<SearchForm onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText(/e\.g\. LeBron/i), "My Search");
    const submit = screen.getByRole("button", { name: /save/i });
    expect(submit).toBeDisabled(); // name alone isn't enough

    await user.type(screen.getByPlaceholderText(/Athlete/i), "LeBron");
    // still disabled — only 1 filter
    expect(submit).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/Manufacturer/i), "Topps");
    // Wait for the picker to load the configured marketplaces
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /eBay/i })).toBeInTheDocument();
    });
    // With 2 filters and eBay auto-selected, should be enabled
    await waitFor(() => {
      expect(submit).not.toBeDisabled();
    });
  });

  it("auto-selects configured marketplaces on mount", async () => {
    render(<SearchForm onSubmit={async () => {}} />);
    await waitFor(() => {
      const ebayBtn = screen.getByRole("button", { name: /eBay/i });
      expect(ebayBtn).toHaveTextContent(/✓/);
    });
  });

  it("disables unavailable marketplaces", async () => {
    render(<SearchForm onSubmit={async () => {}} />);
    await waitFor(() => {
      const tikBtn = screen.getByRole("button", { name: /TikTok/i });
      expect(tikBtn).toBeDisabled();
      expect(tikBtn).toHaveTextContent(/not configured/i);
    });
  });

  it("calls onSubmit with marketplaces array when submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<SearchForm onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText(/e\.g\. LeBron/i), "LeBron RCs");
    await user.type(screen.getByPlaceholderText(/Athlete/i), "LeBron");
    await user.type(screen.getByPlaceholderText(/Manufacturer/i), "Topps");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /eBay/i })).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const payload = onSubmit.mock.calls[0][0] as {
      name: string;
      filters: Record<string, unknown>;
      marketplaces: string[];
    };
    expect(payload.name).toBe("LeBron RCs");
    expect(payload.filters.athlete).toBe("LeBron");
    expect(payload.filters.manufacturer).toBe("Topps");
    expect(payload.marketplaces).toContain("ebay");
    expect(payload.marketplaces).not.toContain("tiktok");
  });

  it("toggles a marketplace off when clicking it twice", async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={async () => {}} />);

    await waitFor(() => {
      const ebayBtn = screen.getByRole("button", { name: /eBay/i });
      expect(ebayBtn).toHaveTextContent(/✓/);
    });

    const ebayBtn = screen.getByRole("button", { name: /eBay/i });
    await user.click(ebayBtn);
    expect(ebayBtn).not.toHaveTextContent(/✓/);
  });

  it("disables submit when no marketplaces are selected", async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={async () => {}} />);

    await user.type(screen.getByPlaceholderText(/e\.g\. LeBron/i), "Test");
    await user.type(screen.getByPlaceholderText(/Athlete/i), "LeBron");
    await user.type(screen.getByPlaceholderText(/Manufacturer/i), "Topps");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /eBay/i })).toHaveTextContent(/✓/);
    });

    // Deselect eBay
    await user.click(screen.getByRole("button", { name: /eBay/i }));

    const submit = screen.getByRole("button", { name: /save/i });
    expect(submit).toBeDisabled();
    expect(screen.getByText(/Pick at least one/i)).toBeInTheDocument();
  });
});
