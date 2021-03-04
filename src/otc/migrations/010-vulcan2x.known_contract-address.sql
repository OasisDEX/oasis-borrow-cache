CREATE TABLE vulcan2x.known_contract (
    bytecode_hash character varying(66) NOT NULL UNIQUE,
    name character varying(50) NOT NULL,
    display_name character varying(50)
);