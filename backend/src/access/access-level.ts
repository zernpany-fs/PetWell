// Only the grant fields the access decision needs.
export type GrantSnapshot = {
  id: string;
  endedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

// D20: what a clinic may see of a pet.
export type AccessLevel =
  | { level: 'FULL'; grantId: string } // full history + owner contact (D5, D9)
  | { level: 'AUTHORED_ONLY' } // id, name, species + own records (D6, D11)
  | { level: 'NONE' }; // 404

/**
 * Active = not ended and not yet expired (D17). Checked on every read,
 * so expiry needs no background job. At the exact expiry moment the
 * grant is already inactive.
 */
export function isGrantActive(
  grant: Pick<GrantSnapshot, 'endedAt' | 'expiresAt'>,
  now: Date,
): boolean {
  if (grant.endedAt !== null) return false;
  return grant.expiresAt === null || grant.expiresAt.getTime() > now.getTime();
}

// D29: true if `a` should be logged instead of `b`.
// Expires later wins (no expiry = latest); on a tie, newer wins.
function isPreferred(a: GrantSnapshot, b: GrantSnapshot): boolean {
  const aEnds = a.expiresAt?.getTime() ?? Infinity;
  const bEnds = b.expiresAt?.getTime() ?? Infinity;
  if (aEnds !== bEnds) return aEnds > bEnds;
  return a.createdAt.getTime() > b.createdAt.getTime();
}

/**
 * Decides what a clinic may see of a pet from all its grants for that pet
 * and whether it has authored active records (D30 is applied by the caller).
 */
export function resolveAccessLevel(
  grants: GrantSnapshot[],
  hasAuthoredRecords: boolean,
  now: Date,
): AccessLevel {
  const active = grants.filter((grant) => isGrantActive(grant, now));

  if (active.length > 0) {
    const chosen = active.reduce((best, grant) =>
      isPreferred(grant, best) ? grant : best,
    );
    return { level: 'FULL', grantId: chosen.id };
  }

  return hasAuthoredRecords ? { level: 'AUTHORED_ONLY' } : { level: 'NONE' };
}
