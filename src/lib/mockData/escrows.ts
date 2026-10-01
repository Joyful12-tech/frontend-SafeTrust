/**
 * Stub escrows for the skeleton escrow list (/dashboard/escrow) and its
 * detail route. The detail page uses `isKnownEscrowId` so unknown or foreign
 * ids render 404 instead of fabricating data for any id.
 */
export const STUB_ESCROWS = [
  {
    id: "abc-123",
    property: "La sabana apartment",
    amount: 4000,
    status: "PENDING" as const,
    createdAt: "2025-01-20",
  },
  {
    id: "def-456",
    property: "Casa verde downtown",
    amount: 2500,
    status: "ACTIVE" as const,
    createdAt: "2025-01-15",
  },
  {
    id: "ghi-789",
    property: "Playa escazú suite",
    amount: 6000,
    status: "COMPLETED" as const,
    createdAt: "2025-01-10",
  },
];

/** Generated mock escrow ids (`escrow_1` … `escrow_N`) from src/lib/mockData. */
const GENERATED_MOCK_ESCROW_ID = /^escrow_[1-9]\d*$/;

/**
 * Whether the id exists in the skeleton data source. With BE-03 in place the
 * backend filters by owner and returns nothing for rows the user can't see;
 * until then, existence is the strongest check available.
 */
export function isKnownEscrowId(id: string): boolean {
  return (
    GENERATED_MOCK_ESCROW_ID.test(id) ||
    STUB_ESCROWS.some((escrow) => escrow.id === id)
  );
}
