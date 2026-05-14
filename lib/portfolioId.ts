/**
 * Portfolio Listing ID Convention
 * 
 * Normal property IDs: 1, 2, 3, ... (sequential, from DB)
 * Portfolio IDs: 900000 + userId (e.g., user 5 → listingId 900005)
 * 
 * This ensures portfolio sessions never conflict with real property sessions.
 */
export const PORTFOLIO_LISTING_ID_OFFSET = 900000;

export function getPortfolioListingId(userId: number): number {
  return PORTFOLIO_LISTING_ID_OFFSET + userId;
}

export function isPortfolioListingId(listingId: number): boolean {
  return listingId >= PORTFOLIO_LISTING_ID_OFFSET;
}

export function getUserIdFromPortfolioListingId(listingId: number): number {
  return listingId - PORTFOLIO_LISTING_ID_OFFSET;
}
