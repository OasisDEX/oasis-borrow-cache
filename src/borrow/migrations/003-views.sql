CREATE VIEW api.events AS (
    SELECT 
        cdp_id,
        ilk, 
        'open-vault' AS type,
        null AS dart,
        null AS dink,
        created_at AS timestamp
    FROM borrow.cdp 
    UNION
    SELECT
        cdp_id,
        ilk,
        CASE
            WHEN dart > 0 AND dink = 0 THEN 'generate'
            WHEN dart < 0 AND dink = 0 THEN 'payback'
            WHEN dart = 0 AND dink > 0 THEN 'deposit'
            WHEN dart = 0 AND dink < 0 THEN 'withdraw'
            WHEN dart < 0 AND dink < 0 THEN 'withdraw-and-payback'
            WHEN dart > 0 AND dink > 0 THEN 'deposit-and-generate'
            ELSE ''
        END AS type,
        dart,
        dink,
        timestamp
    FROM vat.frob
)