TRUNCATE TABLE oasis.token;

ALTER TABLE oasis.token
  ADD CONSTRAINT unique_token_key UNIQUE (key),
  ADD CONSTRAINT unique_token_symbol UNIQUE (symbol);