DELETE FROM oasis.token WHERE chain='kovan' AND key='0xb64964e9c0b658aa7b448cdbddfcdccab26cc584';

INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (E'0x1f9beaf12d8db1e50ea8a5ed53fb970462386aa0',E'DAI',18,E'kovan',E'DAI');