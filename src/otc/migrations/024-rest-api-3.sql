CREATE TABLE rest_api.pair (
    id VARCHAR(10) NOT NULL,
    base VARCHAR(10) NOT NULL,
    quote VARCHAR(10) NOT NULL,
    label VARCHAR(10) NOT NULL,
    sorting INT NOT NULL
);

INSERT INTO rest_api.pair VALUES('WETH/DAI', 'WETH', 'DAI', 'ETH/DAI', 1);
INSERT INTO rest_api.pair VALUES('MKR/DAI', 'MKR', 'DAI', 'MKR/DAI', 2);
INSERT INTO rest_api.pair VALUES('MKR/WETH', 'MKR', 'WETH', 'MKR/ETH', 3);
