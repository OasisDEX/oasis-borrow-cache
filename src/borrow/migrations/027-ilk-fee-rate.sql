CREATE TABLE api.ilk_fees
(
    id serial primary key,
    ilk character varying(32) not null,
    fee_rate numeric(7, 6) not null,
    in_effect_from timestamptz not null,
    unique (ilk, fee_rate, in_effect_from)
);