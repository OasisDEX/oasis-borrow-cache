CREATE VIEW vulcan2x.known_address AS (
  SELECT a.address,
    kc.name,
    kc.display_name
  FROM vulcan2x.address a
    LEFT JOIN vulcan2x.known_contract kc ON a.bytecode_hash = kc.bytecode_hash
);