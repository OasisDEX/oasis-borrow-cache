delete from oasis.token where chain = 'localnet';

INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (lower('0x76c37E57A1438E2a0ac7Fec8a552CDD569b2CAfB'),'DGD',9,'localnet','DGD');
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (lower('0xE8d4C2Ab5782c697f06f17610cC03068180d0FaC'),'REP',18,'localnet','REP');
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (lower('0x2c60CF08c07C212e21e6E2ee4626c478BACe092a'),'ZRX',18,'localnet','ZRX');
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (lower('0xd80110E3C107Eb206B556871cFe2532eC7D05E47'),'BAT',18,'localnet','BAT');
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (lower('0x200938Bf7fF25EcF2eB7BC08e18b0892ED34c846'),'WETH',18,'localnet','WETH');
-- MCD DAI
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (lower('0xafAA69DE13bd8766D9d47c9205439B9B06e533C6'),'DAI',18,'localnet','DAI');
INSERT INTO oasis.token(key, symbol, decimals, chain, name)
VALUES (lower('0x3a21aB4539e11f0C06b583796F3F0FD274eFC369'),'MKR',18,'localnet','MKR');
