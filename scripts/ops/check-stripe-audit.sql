SET NOCOUNT ON;

PRINT '=== Stripe audit health check ===';

IF OBJECT_ID('dbo.stripe_audit_logs', 'U') IS NULL
BEGIN
  RAISERROR('No existe dbo.stripe_audit_logs (migracion 1700000000032 pendiente).', 16, 1);
  RETURN;
END

PRINT '';
PRINT 'Top 20 eventos recientes:';
SELECT TOP (20)
  stripeEventId,
  eventType,
  tenantId,
  planCode,
  billingStatus,
  processedAt
FROM dbo.stripe_audit_logs
ORDER BY processedAt DESC;

PRINT '';
PRINT 'Eventos por tipo (ultimos 7 dias):';
SELECT
  eventType,
  COUNT(1) AS total
FROM dbo.stripe_audit_logs
WHERE processedAt >= DATEADD(DAY, -7, SYSUTCDATETIME())
GROUP BY eventType
ORDER BY total DESC;

PRINT '';
PRINT 'Eventos potencialmente duplicados por stripeEventId:';
SELECT
  stripeEventId,
  COUNT(1) AS repeticiones
FROM dbo.stripe_audit_logs
GROUP BY stripeEventId
HAVING COUNT(1) > 1
ORDER BY repeticiones DESC, stripeEventId;

PRINT '';
PRINT 'Tenants con estado de billing y ultima traza Stripe:';
SELECT
  t.id AS tenantId,
  t.slug,
  t.planCode,
  t.billingStatus,
  t.stripeCustomerId,
  t.stripeSubscriptionId,
  lastStripe.processedAt AS lastStripeEventAt,
  lastStripe.eventType AS lastStripeEventType
FROM dbo.tenants t
OUTER APPLY (
  SELECT TOP (1)
    sal.processedAt,
    sal.eventType
  FROM dbo.stripe_audit_logs sal
  WHERE sal.tenantId = t.id
  ORDER BY sal.processedAt DESC
) lastStripe
ORDER BY t.id;
