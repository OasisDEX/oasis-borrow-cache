CREATE VIEW api.historic_block AS
SELECT b.number,
    b.hash,
    b.timestamp
FROM vulcan2x.block b
ORDER BY b.timestamp desc;