/**
 * D46: run every database session in UTC.
 *
 * @prisma/adapter-pg sends DateTime values without a UTC offset, so Postgres
 * reads them in the session time zone. On a server set to Asia/Bangkok every
 * timestamp was stored 7 hours early. Forcing the session to UTC stores the
 * real time, whatever the server's own time zone is.
 *
 * Used by PrismaService and prisma/seed.ts so both write the same way.
 */
export const PG_SESSION_OPTIONS = '-c TimeZone=UTC';
