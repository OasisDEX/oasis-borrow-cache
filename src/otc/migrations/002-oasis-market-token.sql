CREATE TABLE oasis.market (
    id character varying(10) NOT NULL,
    base character varying(10),
    quote character varying(10)
);

CREATE INDEX market_id_key ON oasis.market(id);
CREATE INDEX market_base_key ON oasis.market(base);
CREATE INDEX market_quote_key ON oasis.market(quote);


CREATE TABLE oasis.token (
    key character varying(66) NOT NULL,
    symbol character varying(5) NOT NULL,
    decimals integer,
    chain character varying(10),
    name character varying(66)
);

CREATE INDEX token_key_key ON oasis.token(key);
CREATE INDEX token_symbol_key ON oasis.token(symbol);
