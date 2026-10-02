import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MessageComposer } from "./MessageComposer";

const toastSuccess = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

describe("MessageComposer", () => {
  beforeEach(() => {
    toastSuccess.mockClear();
  });

  it("sends on enter without shift and shows the skeleton toast", async () => {
    render(
      <MessageComposer
        conversationId="conv-1"
        senderId="test-user-1"
        apartmentId="mock-apartment-1"
      />,
    );

    const input = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(input, { target: { value: "Hello John" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        "Message sent! (skeleton mode)",
      );
    });
    expect(input).toHaveValue("");
  });

  it("does not send an empty message", async () => {
    render(
      <MessageComposer
        conversationId="conv-1"
        senderId="test-user-1"
        apartmentId="mock-apartment-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
