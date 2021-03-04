DELETE FROM oasis.token WHERE key='0xe0b7927c4af23765cb51314a0e0521a9645f0e2a';
DELETE FROM oasis.token WHERE key='0x1985365e9f78359a9B6AD760e32412f4a445E862';
DELETE FROM oasis.token WHERE key='0x1985365e9f78359a9b6ad760e32412f4a445e862';
DELETE FROM oasis.token WHERE key='0xe41d2489571d322189246dafa5ebde1f4699f498';
DELETE FROM oasis.token WHERE key='0x0d8775f648430679a709e98d2b0cb6250d2887ef';

INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (E'0xe0b7927c4af23765cb51314a0e0521a9645f0e2a',E'DGD',9,E'mainnet',E'DGD');
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (E'0x1985365e9f78359a9b6ad760e32412f4a445e862',E'REP',18,E'mainnet',E'REP');
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (E'0xe41d2489571d322189246dafa5ebde1f4699f498',E'ZRX',18,E'mainnet',E'ZRX');
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (E'0x0d8775f648430679a709e98d2b0cb6250d2887ef',E'BAT',18,E'mainnet',E'BAT');